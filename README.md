## ollama server web interface thingie

you are solely responsible for what you do and this is for very educational purposes and i am not liable for anything and stuff and yea


screenshot
![](README_20261027230226126.png)
### what it does
so essentially what it does is that it reads a file with the ip adresses and ports of (for legal reasons, your own) ollama servers and lets you use them for generating text or images (which would be for legal reasons illegal, so don't, its for education or sth)

### features
- unlimited servers (if your computer can handle it, duh)
- checks if servers are up every hour
- runs mostly in the browser, the backend only checks servers and models
- system prompt and temperature
- chat history in your browser
- no css (who needs that anyways)
- image generation through unspecified methods which may not be used for legal reasons and might cease to work at any moment

### how to set up
1. install node js
2. clone the repository
3. install express and axios (npm install express axios)
4. populate ip.txt with (for legal reasons, your own) servers ip addresses (completely unrelated, but have you ever heard of [shodan](https://www.shodan.io/search?query=product%3Aollama)?)
5. start with "node server.js"
6. go to [localhost:3000](http://localhost:3000/)
7. profit (i think)

### how to use
i think that is very obvious but anyways

for text:
- put the system prompt in the system prompt box (or dont)
- select a model 
- leave the temperature slider as is (except if you want funny)
- put the prompt in the prompt for text model field
- press send
- wait multiple seconds


for images:
- image generation is illegal 
- can you not read?
- stupid you

if you know how to make a nice css file please open a pull request

disclaimer
blah blah blah for educational purposes only blah blah blah use at your own risk blah blah blah not officially affiliated with tadc (<-- very funny [reference](https://www.youtube.com/watch?v=kJQlHqLf-aE) i know)



made by me, human

made without bad robots

made in visualstudiocodium

made on the arch linux btw operating system