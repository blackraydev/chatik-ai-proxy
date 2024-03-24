const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

const googleGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiPro = googleGenAI.getGenerativeModel({ model: 'gemini-pro' });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
  const corsWhiteList = ['https://blackraydev.github.io', 'https://localhost:5173'];

  if (corsWhiteList.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  next();
});

app.post('/askChatik', async (req, res) => {
  const { history, message } = req.body;

  const actualHistory = history
    .filter((historyPart) => !historyPart.error)
    .map((historyPart) => ({ ...historyPart, parts: [{ text: historyPart.message }] }));

  const chat = geminiPro.startChat({ history: actualHistory });
  const geminiResponse = await chat.sendMessageStream(message);

  for await (const chunk of geminiResponse.stream) {
    const message = chunk.text();
    res.write(message);
  }

  res.end();
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
