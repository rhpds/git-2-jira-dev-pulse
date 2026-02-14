import { http, HttpResponse } from 'msw';
import { mockRepos, mockWorkSummaries, mockTicketSuggestions } from './mockData';

const API_URL = 'http://localhost:8000';

export const handlers = [
  // Health check
  http.get(`${API_URL}/api/health`, () => {
    return HttpResponse.json({ status: 'ok', jira_connected: true });
  }),

  // Folders endpoints
  http.get(`${API_URL}/api/folders/`, () => {
    return HttpResponse.json(mockRepos);
  }),

  http.post(`${API_URL}/api/folders/analyze`, () => {
    return HttpResponse.json(mockWorkSummaries);
  }),

  // Jira endpoints
  http.post(`${API_URL}/api/jira/suggest`, () => {
    return HttpResponse.json(mockTicketSuggestions);
  }),

  http.post(`${API_URL}/api/jira/create-batch`, () => {
    return HttpResponse.json({
      created: [
        {
          key: 'TEST-123',
          url: 'https://jira.example.com/browse/TEST-123',
          summary: 'Test ticket',
          duplicate: false,
          error: null,
        },
      ],
      skipped_duplicates: 0,
      errors: 0,
    });
  }),

  // History endpoints
  http.get(`${API_URL}/api/history/runs`, () => {
    return HttpResponse.json([]);
  }),

  // Templates endpoints
  http.get(`${API_URL}/api/templates/`, () => {
    return HttpResponse.json([]);
  }),
];
