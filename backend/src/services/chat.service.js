const { answerQuestion } = require('./ai-assist.service');

function rankRelevantEndpoints(question, endpoints = []) {
  const normalizedQuestion = String(question || '').toLowerCase();
  const words = normalizedQuestion.split(/\s+/).filter(Boolean);

  return endpoints
    .map((endpoint) => {
      const text = `${endpoint.path} ${endpoint.summary} ${endpoint.description}`.toLowerCase();
      const score = words.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
      return { endpoint, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => ({
      method: entry.endpoint.method,
      path: entry.endpoint.path,
      score: entry.score
    }));
}

async function chatWithApi({ question, projectData }) {
  const answer = answerQuestion(question, projectData);
  const citations = rankRelevantEndpoints(question, projectData.endpoints || []);

  return {
    answer,
    citations
  };
}

module.exports = {
  chatWithApi
};
