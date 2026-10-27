//this might cease to work at any time.

async function generateI(iPrompt, goodness) {
    const url =
        "https://proxy.corsfix.com/?https://pikzels.kumar-coding.dev/api/generate";
    const tree = "tree";
    const payload = {
        prompt: iPrompt, //haha iPrompt like apple get it because iPhone
        arrow: false,
        shocked: false,
        good: goodness,
        turnstileToken: null,
    };

    const headers = {
        Accept: "*/*",
        "Accept-Language": "en-GB,en;q=0.9",
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
            //credentials: "include"
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data.url);
        document.getElementById("genimg").src = "";
        document.getElementById("genimg").src = data.url;
    } catch (error) {
        console.error("Error:", error);
    }
}
