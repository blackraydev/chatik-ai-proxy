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

app.post('/askMeetik', async (req, res) => {
  const { message } = req.body;
  const result = await geminiPro.generateContent(message);
  const response = await result.response;
  const text = response.text();

  res.json(text);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
