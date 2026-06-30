import appModule from '../dist/server.cjs';

const app = appModule?.default ?? appModule;

export default function handler(req, res) {
  return app(req, res);
}
