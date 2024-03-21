import OpenAI from "openai";

const openai = new OpenAI();
const express = require('express');
const app = express();
const port = 3000;

async function main() {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      model: "gpt-3.5-turbo",
    });
  
    console.log(completion.choices[0]);
  }

main();

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`App listening at http://localhost:${port}`));
