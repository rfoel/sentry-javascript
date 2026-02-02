import * as Sentry from '@sentry/node';
import express from 'express';
import OpenAI from 'openai';

function startMockServer() {
  const app = express();
  app.use(express.json());

  app.post('/openai/chat/completions', (req, res) => {
    const { model } = req.body;

    res.set({
      'x-request-id': 'req_withresponse_test',
      'openai-organization': 'test-org',
      'openai-processing-ms': '150',
      'openai-version': '2020-10-01',
    });

    res.send({
      id: 'chatcmpl-withresponse',
      object: 'chat.completion',
      created: 1677652288,
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Testing .withResponse() method!',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 12,
        total_tokens: 20,
      },
    });
  });

  return new Promise(resolve => {
    const server = app.listen(0, () => {
      resolve(server);
    });
  });
}

async function run() {
  const server = await startMockServer();

  await Sentry.startSpan({ op: 'function', name: 'main' }, async () => {
    const client = new OpenAI({
      baseURL: `http://localhost:${server.address().port}/openai`,
      apiKey: 'mock-api-key',
    });

    // Test 1: Verify .withResponse() method exists and can be called
    const result = client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test withResponse' }],
    });

    // Verify method exists
    if (typeof result.withResponse !== 'function') {
      throw new Error('.withResponse() method does not exist');
    }

    // Call .withResponse() and verify structure
    const { data } = await result.withResponse();

    if (!data) {
      throw new Error('.withResponse() did not return data');
    }

    // Test 2: Verify regular await still works
    const result2 = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test regular await' }],
    });

    if (!result2 || result2.id !== 'chatcmpl-withresponse') {
      throw new Error('Regular await failed');
    }
  });

  server.close();
}

run();
