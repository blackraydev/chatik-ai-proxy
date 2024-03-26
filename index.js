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

app.get('/conversations', async (req, res) => {
  const { userId } = req.query;
  console.log(userId);
  console.log(db.conversations);
  const conversations = db.conversations.filter((conversation) => conversation?.userId == userId);

  res.json({ conversations });
});

app.post('/conversations', async (req, res) => {
  const { userId, conversationId, prompt } = req.body;

  const generateTitlePrompt = 'Generate a short title for this text (maximum of 5 words)';
  const content = await geminiPro.generateContent(`${generateTitlePrompt}: ${prompt}`);
  const title = content.response.text();

  const conversation = {
    id: conversationId,
    userId,
    title,
    updatedAt: new Date().getTime(),
  };

  db.conversations = [...db.conversations, conversation];

  res.json({ conversation });
});

app.get('/messages', async (req, res) => {
  const { conversationId } = req.query;
  const messages = db.messages.filter((message) => message.conversationId === conversationId);

  res.json({ messages });
});

app.post('/askChatik', async (req, res) => {
  const { conversationId, userMessage } = req.body;

  const messages = db.messages.filter((message) => message.conversationId === conversationId);
  const history = messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));

  const chat = geminiPro.startChat({ history });
  const geminiResponse = await chat.sendMessageStream(userMessage.toString());

  let botMessage = '';

  for await (const chunk of geminiResponse.stream) {
    const message = chunk.text();

    botMessage += message;
    res.write(message);
  }

  db.messages = [
    ...db.messages,
    {
      role: 'user',
      text: userMessage,
      conversationId,
    },
    {
      role: 'model',
      text: botMessage,
      conversationId,
    },
  ];

  db.conversations = db.conversations.map((conversation) => {
    if (conversation.id === conversationId) {
      return {
        ...conversation,
        updatedAt: new Date().getTime(),
      };
    }
  });

  res.end();
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
