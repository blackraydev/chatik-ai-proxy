const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GOOGLE_API_KEY = 'AIzaSyCaT0ofPu4r6zPSxdjazcPak9DIC0lnhGQ';

const app = express();
const googleGenAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

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
