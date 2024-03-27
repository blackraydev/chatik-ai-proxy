const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();

const googleGenAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const geminiPro = googleGenAI.getGenerativeModel({ model: 'gemini-pro' });

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const sequelize = new Sequelize(process.env.POSTGRES_CONNECTION_STRING);

const Users = sequelize.define('Users', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: false,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
  },
  photoURL: {
    type: DataTypes.STRING,
  },
  tariff: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Conversations = sequelize.define('Conversations', {
  id: {
    type: DataTypes.STRING,
    autoIncrement: false,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

const Messages = sequelize.define('Messages', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

(async () => {
  await sequelize.sync({ force: true, logging: false });
})();

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

app.post('/users', async (req, res) => {
  try {
    const { id, firstName, lastName, photoURL } = req.body;

    const [user] = await Users.findOrCreate({
      where: { id },
      defaults: {
        id,
        firstName,
        lastName,
        photoURL,
        tariff: 'free',
      },
    });

    res.json({ user });
  } catch (e) {
    console.log('POST Users:', e.message);
    res.json('Something went wrong');
  }
});

app.get('/conversations', async (req, res) => {
  try {
    const { userId } = req.query;
    const conversations = await Conversations.findAll({ where: { userId } });

    res.json({ conversations });
  } catch (e) {
    console.log('GET Conversations:', e.message);
    res.json('Something went wrong');
  }
});

app.post('/conversations', async (req, res) => {
  try {
    const { userId, conversationId, prompt } = req.body;

    const generateTitlePrompt =
      'Generate a short title for conversation based on the following prompt (maximum of 5 words)';
    const fullPrompt = `${generateTitlePrompt}: ${prompt}`;

    const content = await geminiPro.generateContent({
      contents: [{ parts: [{ text: fullPrompt }] }],
      safetySettings,
    });
    const title = content.response.text();

    const conversation = await Conversations.create({
      id: conversationId,
      userId,
      title,
    });

    res.json({ conversation });
  } catch (e) {
    console.log('POST Conversations:', e.message);
    res.json('Something went wrong');
  }
});

app.get('/messages', async (req, res) => {
  try {
    const { conversationId } = req.query;
    const messages = await Messages.findAll({ where: { conversationId } });

    res.json({ messages });
  } catch (e) {
    console.log('GET Messages:', e.message);
    res.json('Something went wrong');
  }
});

app.post('/askChatik', async (req, res) => {
  try {
    const { conversationId, userMessage } = req.body;

    const messages = await Messages.findAll({ where: { conversationId } });
    const history = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    const chat = geminiPro.startChat({ history, safetySettings });
    const geminiResponse = await chat.sendMessageStream(userMessage.toString());

    let botMessage = '';

    for await (const chunk of geminiResponse.stream) {
      const message = chunk.text();

      botMessage += message;
      res.write(message);
    }

    await Messages.bulkCreate([
      { role: 'user', text: userMessage, conversationId },
      { role: 'model', text: botMessage, conversationId },
    ]);
    await Conversations.update(
      {},
      {
        where: {
          id: conversationId,
        },
      },
    );

    res.end();
  } catch (e) {
    console.log('POST AskChatik:', e.message);
    res.json('Something went wrong');
  }
});

app.listen(3000, async () => {
  console.log('Server running on port 3000');

  try {
    await sequelize.authenticate({ logging: false });
    console.log('Connection to DataBase has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
