# AutoCoder Development Guide

## 🚀 Quick Start

### Start All Services
```bash
./start_dev.sh
```

This will start:
- Backend API on http://localhost:8889
- Frontend on http://localhost:5173

### Start Services Individually

Backend only:
```bash
./start_backend_dev.sh
```

Frontend only:
```bash
./start_frontend_dev.sh
```

### Stop All Services
```bash
./stop_dev.sh
```

Or press `Ctrl+C` in the terminal running `start_dev.sh`

## 📁 Project Structure

```
autocoder/
├── server/           # Backend FastAPI application
├── ui/              # Frontend React application
├── api/             # Database & API utilities
├── projects/        # Development projects
├── .env.dev         # Backend environment variables
├── ui/.env.development  # Frontend environment variables
└── venv/            # Python virtual environment
```

## 🔧 Configuration

### Backend (.env.dev)
- Port: 8889
- Ollama: http://localhost:11434
- Hot reload: Enabled
- Debug mode: Enabled

### Frontend (ui/.env.development)
- Port: 5173
- API URL: http://localhost:8889
- Builder.io: Not configured

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8889
- **API Docs**: http://localhost:8889/docs
- **API Redoc**: http://localhost:8889/redoc
- **Ollama**: http://localhost:11434

## 🔑 API Keys

### Gemini (Google AI)
✓ Configured

### Anthropic (Claude)
Not configured - Add to .env.dev

### Builder.io
Not configured - Add to ui/.env.development

To add API keys later:
1. Edit `.env.dev` for backend keys
2. Edit `ui/.env.development` for frontend keys
3. Restart the respective service

## 🛠️ Development Tools

### VSCode Debugging
Use the VSCode debugger with these launch configurations:
- **Full Stack**: Starts both backend and frontend
- **Python: Backend Server**: Backend only
- **Frontend: Dev Server**: Frontend only

Press `F5` or use the Run and Debug panel.

### Hot Reload
Both frontend and backend have hot reload enabled:
- Backend: Changes to Python files auto-restart server
- Frontend: Changes to React files auto-refresh browser

### Database
SQLite database: `autocoder_dev.db`

To reset database:
```bash
rm autocoder_dev.db
# Restart backend to recreate
```

## 📦 Adding Dependencies

### Backend (Python)
```bash
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
deactivate
```

### Frontend (Node)
```bash
cd ui
npm install package-name
```

## 🧪 Testing

### Run Backend Tests
```bash
source venv/bin/activate
pytest
deactivate
```

### Run Frontend Tests
```bash
cd ui
npm test
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
./stop_dev.sh
# Or manually:
lsof -ti:8889 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Backend Won't Start
1. Check if virtual environment is activated
2. Verify all dependencies installed: `pip install -r requirements.txt`
3. Check `.env.dev` configuration
4. View logs for errors

### Frontend Won't Start
1. Check if node_modules installed: `cd ui && npm install`
2. Verify `.env.development` exists
3. Check for port conflicts

### Ollama Connection Failed
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check OLLAMA_BASE_URL in `.env.dev`
3. Update URL and restart backend

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to remote
git push origin feature/your-feature
```

## 🔗 Useful Commands

```bash
# View backend logs
tail -f logs/autocoder.log

# Check running processes
ps aux | grep uvicorn
ps aux | grep vite

# Check port usage
lsof -i:8889
lsof -i:5173

# Rebuild frontend
cd ui && npm run build

# Format code
cd ui && npm run format
```

## 📚 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)

- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

Happy coding! 🚀
