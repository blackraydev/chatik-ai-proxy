const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const googleGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const geminiPro = googleGenAI.getGenerativeModel({ model: 'gemini-pro' });

app.get('/askMeetik', async (req, res, next) => {
  const message = 'Write a story about a magic backpack.';
  const result = await geminiPro.generateContent(message);
  const response = await result.response;
  const text = response.text();

  res.json(text);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
