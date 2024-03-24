const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

const googleGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiPro = googleGenAI.getGenerativeModel({ model: 'gemini-pro' });

let db = {
  users: [],
  conversations: [],
  messages: [],
};

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

app.get('/conversation', async (req, res) => {
  const { userId } = req.query;
  const conversation = db.conversations.find((conversation) => conversation.userId === userId);
  const conversationId = conversation?.id;
  const messages = db.messages.filter((message) => message.conversationId === conversationId);

  res.json({ messages });
});

app.post('/askChatik', async (req, res) => {
  const { conversationId, userMessage } = req.body;

  const fullUserMessage = {
    role: 'user',
    text: userMessage,
    conversationId,
  };
  const messages = db.messages.filter((message) => message.conversationId === conversationId);
  const history = [...messages, fullUserMessage].map((message) => {
    return {
      role: message.role,
      parts: [{ text: message.text }],
    };
  });

  const chat = geminiPro.startChat({ history });
  const geminiResponse = await chat.sendMessageStream(userMessage);

  let botMessage = '';

  for await (const chunk of geminiResponse.stream) {
    const message = chunk.text();

    botMessage += message;
    res.write(message);
  }

  db.messages = [
    ...db.messages,
    fullUserMessage,
    {
      role: 'model',
      text: botMessage,
      conversationId,
    },
  ];

  res.end();
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
