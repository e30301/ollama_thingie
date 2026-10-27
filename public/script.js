const model_select = document.getElementById("model");
const prompt_input = document.getElementById("prompt");
const send_button = document.getElementById("send");
const clear_button = document.getElementById("clear");
const messages_container = document.getElementById("messages");
const system_prompt_input = document.getElementById("systemPrompt");
const temperature_slider = document.getElementById("temperature_slider");
const temperature_value = document.getElementById("temperature_val");
const cors_url = "https://proxy.corsfix.com/?";

const storage_keys = {
  model: "selectedModel",
  system_prompt: "systemPrompt",
  messages: "messages",
};

let server_data = {};

function read_messages() {
  try {
    const saved_messages = localStorage.getItem(storage_keys.messages);
    const messages = saved_messages ? JSON.parse(saved_messages) : [];
    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    console.error("could not read saved messages,", error);
    return [];
  }
}

function save_messages(messages) {
  try {
    localStorage.setItem(storage_keys.messages, JSON.stringify(messages));
  } catch (error) {
    console.error("could not save messages,", error);
    alert("unable to save chat history");
  }
}

function escape_html(value = "") {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return String(value).replace(
    /[&<>"']/g,
    (character) => replacements[character],
  );
}

async function init() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) {
      throw new Error(`server returned ${response.status}`);
    }

    server_data = await response.json();
    add_models();
    restore_model();
    restore_system_prompt();
    render_messages();
  } catch (error) {
    console.error("failed to load server data,", error);
  }
}

function add_models() {
  const options = [{ value: "", text: "select a model" }];

  for (const server of server_data.servers || []) {
    for (const model_name of server.models || []) {
      if (!model_name.includes(":cloud")) {
        options.push({
          value: JSON.stringify({ model: model_name, url: server.url }),
          text: `${model_name} (${server.url})`,
        });
      }
    }
  }

  const saved_value = model_select.value;
  model_select.replaceChildren();

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.text;
    model_select.appendChild(element);
  }

  model_select.value = saved_value;
}

function restore_model() {
  const saved_model = localStorage.getItem(storage_keys.model);

  if (
    saved_model &&
    [...model_select.options].some((option) => option.value === saved_model)
  ) {
    model_select.value = saved_model;
  }
}

function restore_system_prompt() {
  system_prompt_input.value =
    localStorage.getItem(storage_keys.system_prompt) || "";
}

function render_messages() {
  const messages = read_messages();

  messages_container.innerHTML = messages
    .map((message) => {
      const tokens_per_second = Number.isFinite(message.tokens_per_second)
        ? message.tokens_per_second.toFixed(2)
        : "N/A";

      return `
      <div>
        <p><strong>${escape_html(message.model_name)}</strong></p>
        <p><strong>You:</strong> ${escape_html(message.prompt)}</p>
        <p><strong>Response:</strong> ${escape_html(message.response)}</p>
        <p><em>Status: ${escape_html(message.status)} | Tokens/s: ${tokens_per_second}</em></p>
        <hr>
      </div>
    `;
    })
    .join("");

  messages_container.scrollTop = messages_container.scrollHeight;
}

function build_prompt(current_prompt, model_name, server_url) {
  const history = read_messages().filter(
    (message) =>
      message.model_name === model_name &&
      message.server_url === server_url &&
      message.response,
  );

  const conversation = history.flatMap((message) => [
    `User: ${message.prompt}`,
    `Assistant: ${message.response}`,
  ]);

  conversation.push(`User: ${current_prompt}`);
  return conversation.join("\n");
}

async function submit_question() {
  let selected_model;

  try {
    selected_model = JSON.parse(model_select.value);
  } catch {
    selected_model = null;
  }

  if (!selected_model?.model || !selected_model?.url) {
    alert("select a model");
    return;
  }

  const current_prompt = prompt_input.value.trim();
  if (!current_prompt) return;

  const model_name = selected_model.model;
  const server_url = selected_model.url;
  const message_id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const messages = read_messages();
  messages.push({
    id: message_id,
    model_name,
    server_url,
    prompt: current_prompt,
    response: "",
    status: "waiting",
    tokens_per_second: null,
  });

  save_messages(messages);
  prompt_input.value = "";
  render_messages();

  try {
    const response = await fetch(
      `${server_url.replace(/\/$/, "")}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model_name,
          prompt: build_prompt(current_prompt, model_name, server_url),
          system: system_prompt_input.value,
          temperature: Number.parseFloat(temperature_slider.value),
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`err (${response.status})`);
    }

    if (!response.body) {
      throw new Error("no response stream");
    }

    update_message(message_id, { status: "streaming" });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full_response = "";

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        let chunk;
        try {
          chunk = JSON.parse(line);
        } catch {
          continue;
        }

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        if (chunk.response) {
          full_response += chunk.response;
        }

        const updates = {
          response: full_response,
          status: chunk.done ? "done" : "streaming",
        };

        if (chunk.eval_count && chunk.eval_duration) {
          updates.tokens_per_second =
            chunk.eval_count / (chunk.eval_duration / 1e9);
        }

        update_message(message_id, updates);
      }

      if (done) break;
    }

    if (buffer.trim()) {
      try {
        const chunk = JSON.parse(buffer);
        if (chunk.response) {
          full_response += chunk.response;
        }
      } catch {}
    }

    update_message(message_id, {
      response: full_response,
      status: "done",
    });
  } catch (error) {
    update_message(message_id, { status: `err ${error.message}` });
  }
}

function update_message(message_id, updates) {
  const messages = read_messages();
  const message = messages.find((item) => item.id === message_id);

  if (!message) return;

  Object.assign(message, updates);
  save_messages(messages);
  render_messages();
}

function clear_history() {
  if (!confirm("clear all message history?")) return;

  localStorage.removeItem(storage_keys.messages);
  render_messages();
}

model_select.addEventListener("change", () => {
  localStorage.setItem(storage_keys.model, model_select.value);
});

system_prompt_input.addEventListener("change", () => {
  localStorage.setItem(storage_keys.system_prompt, system_prompt_input.value);
});

temperature_slider.addEventListener("input", (event) => {
  temperature_value.textContent = event.target.value;
});

send_button.addEventListener("click", submit_question);
clear_button.addEventListener("click", clear_history);

prompt_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submit_question();
  }
});

init();
