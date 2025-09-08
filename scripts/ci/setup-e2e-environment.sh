#!/bin/bash

# E2E Test Environment Setup Script
# Sets up the environment for E2E testing in CI/CD

set -e

echo "🚀 Setting up E2E test environment..."

# Configuration
NODE_VERSION=${NODE_VERSION:-"18"}
PYTHON_VERSION=${PYTHON_VERSION:-"3.11"}
BACKEND_PORT=${BACKEND_PORT:-8080}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
MAX_WAIT_TIME=${MAX_WAIT_TIME:-120}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required tools
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_info "All dependencies available"
}

# Setup backend
setup_backend() {
    log_info "Setting up backend..."
    
    # Install Python dependencies
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    else
        log_warn "requirements.txt not found, skipping Python dependencies"
    fi
    
    # Start backend server
    log_info "Starting backend server on port $BACKEND_PORT..."
    python -m uvicorn src.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload &
    BACKEND_PID=$!
    
    # Save PID for cleanup
    echo $BACKEND_PID > .backend.pid
    
    log_info "Backend server started with PID $BACKEND_PID"
}

# Setup frontend
setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # Build if in production mode
    if [ "$NODE_ENV" = "production" ]; then
        log_info "Building frontend for production..."
        npm run build
    fi
    
    # Start development server
    log_info "Starting frontend server on port $FRONTEND_PORT..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Save PID for cleanup
    echo $FRONTEND_PID > ../.frontend.pid
    
    log_info "Frontend server started with PID $FRONTEND_PID"
    
    cd ..
}

# Wait for servers to be ready
wait_for_servers() {
    log_info "Waiting for servers to be ready..."
    
    local backend_url="http://localhost:$BACKEND_PORT/api/health"
    local frontend_url="http://localhost:$FRONTEND_PORT"
    
    local wait_time=0
    local check_interval=5
    
    while [ $wait_time -lt $MAX_WAIT_TIME ]; do
        log_info "Checking servers... (${wait_time}s elapsed)"
        
        # Check backend
        if curl -sf "$backend_url" > /dev/null 2>&1; then
            log_info "Backend is ready at $backend_url"
            backend_ready=true
        else
            backend_ready=false
        fi
        
        # Check frontend
        if curl -sf "$frontend_url" > /dev/null 2>&1; then
            log_info "Frontend is ready at $frontend_url"
            frontend_ready=true
        else
            frontend_ready=false
        fi
        
        # Both servers ready
        if [ "$backend_ready" = true ] && [ "$frontend_ready" = true ]; then
            log_info "All servers are ready!"
            return 0
        fi
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done
    
    log_error "Servers did not start within ${MAX_WAIT_TIME}s"
    return 1
}

# Install Playwright browsers
install_browsers() {
    log_info "Installing Playwright browsers..."
    
    cd frontend
    
    # Install specific browsers based on environment
    if [ "$PLAYWRIGHT_BROWSERS" ]; then
        for browser in $PLAYWRIGHT_BROWSERS; do
            log_info "Installing $browser..."
            npx playwright install "$browser" --with-deps
        done
    else
        log_info "Installing all browsers..."
        npx playwright install --with-deps
    fi
    
    cd ..
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    # E2E test specific variables
    export CI=true
    export NODE_ENV=${NODE_ENV:-test}
    export BASE_URL="http://localhost:$FRONTEND_PORT"
    export API_BASE_URL="http://localhost:$BACKEND_PORT"
    export PLAYWRIGHT_WORKERS=${PLAYWRIGHT_WORKERS:-2}
    
    # Playwright optimizations
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-false}
    export PLAYWRIGHT_BROWSER_PATH=${PLAYWRIGHT_BROWSER_PATH:-""}
    
    # Test database (if applicable)
    export DATABASE_URL=${TEST_DATABASE_URL:-$DATABASE_URL}
    
    log_info "Environment variables configured"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local backend_url="http://localhost:$BACKEND_PORT/api/health"
    local frontend_url="http://localhost:$FRONTEND_PORT"
    
    # Backend health check
    if response=$(curl -s "$backend_url" 2>/dev/null); then
        log_info "Backend health: OK"
        echo "Backend response: $response"
    else
        log_warn "Backend health check failed"
    fi
    
    # Frontend health check
    if curl -sf "$frontend_url" > /dev/null 2>&1; then
        log_info "Frontend health: OK"
    else
        log_warn "Frontend health check failed"
    fi
    
    # System resources
    log_info "System resources:"
    echo "Memory: $(free -h | grep '^Mem' | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up processes..."
    
    if [ -f ".backend.pid" ]; then
        local backend_pid=$(cat .backend.pid)
        if kill -0 $backend_pid 2>/dev/null; then
            log_info "Stopping backend server (PID: $backend_pid)"
            kill $backend_pid
        fi
        rm -f .backend.pid
    fi
    
    if [ -f ".frontend.pid" ]; then
        local frontend_pid=$(cat .frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            log_info "Stopping frontend server (PID: $frontend_pid)"
            kill $frontend_pid
        fi
        rm -f .frontend.pid
    fi
    
    # Kill any remaining processes on the ports
    local backend_process=$(lsof -t -i:$BACKEND_PORT 2>/dev/null || true)
    if [ "$backend_process" ]; then
        log_info "Killing remaining backend processes on port $BACKEND_PORT"
        kill -9 $backend_process 2>/dev/null || true
    fi
    
    local frontend_process=$(lsof -t -i:$FRONTEND_PORT 2>/dev/null || true)
    if [ "$frontend_process" ]; then
        log_info "Killing remaining frontend processes on port $FRONTEND_PORT"
        kill -9 $frontend_process 2>/dev/null || true
    fi
}

# Signal handlers
trap cleanup EXIT
trap 'log_error "Script interrupted"; exit 130' INT TERM

# Main execution
main() {
    log_info "Starting E2E environment setup..."
    
    check_dependencies
    setup_environment
    setup_backend
    setup_frontend
    wait_for_servers
    install_browsers
    health_check
    
    log_info "✅ E2E environment setup complete!"
    
    if [ "$1" = "--wait" ]; then
        log_info "Keeping servers running. Press Ctrl+C to stop."
        wait
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [--wait] [--help]"
        echo ""
        echo "Options:"
        echo "  --wait    Keep servers running after setup"
        echo "  --help    Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  NODE_VERSION         Node.js version (default: 18)"
        echo "  PYTHON_VERSION       Python version (default: 3.11)"
        echo "  BACKEND_PORT         Backend port (default: 8080)"
        echo "  FRONTEND_PORT        Frontend port (default: 3000)"
        echo "  MAX_WAIT_TIME        Max wait time for servers (default: 120s)"
        echo "  PLAYWRIGHT_BROWSERS  Specific browsers to install"
        echo "  PLAYWRIGHT_WORKERS   Number of test workers (default: 2)"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac