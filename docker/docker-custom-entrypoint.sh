#!/bin/sh

print_banner() {
    echo "----------------------------------------"
    echo "n8n Puppeteer Node - Environment Details"
    echo "----------------------------------------"
    echo "Node.js version: $(node -v)"
    echo "n8n version: $(n8n --version)"

    # Get Chromium version specifically from the path we're using for Puppeteer
    CHROME_VERSION=$("$PUPPETEER_EXECUTABLE_PATH" --version 2>/dev/null || echo "Chromium not found")
    echo "Chromium version: $CHROME_VERSION"

    # Get Puppeteer version if installed
    PUPPETEER_PATH="/home/node/.n8n/nodes/node_modules/n8n-nodes-puppeteer"
    if [ -f "$PUPPETEER_PATH/package.json" ]; then
        PUPPETEER_VERSION=$(node -p "require('$PUPPETEER_PATH/package.json').version")
        echo "n8n-nodes-puppeteer version: $PUPPETEER_VERSION"

        # Try to resolve puppeteer package from the n8n-nodes-puppeteer directory
        CORE_PUPPETEER_VERSION=$(cd "$PUPPETEER_PATH" && node -e "try { const version = require('puppeteer/package.json').version; console.log(version); } catch(e) { console.log('not found'); }")
        echo "Puppeteer core version: $CORE_PUPPETEER_VERSION"
    else
        echo "n8n-nodes-puppeteer: not installed"
    fi

    echo "Puppeteer executable path: $PUPPETEER_EXECUTABLE_PATH"
    echo "----------------------------------------"
}

# Create .n8n/nodes directory if it doesn't exist
mkdir -p /home/node/.n8n/nodes

PUPPETEER_PATH="/home/node/.n8n/nodes/node_modules/n8n-nodes-puppeteer"

if [ -d "$PUPPETEER_PATH" ]; then
    echo "n8n-nodes-puppeteer is already installed, skipping installation"
else
    echo "Installing n8n-nodes-puppeteer..."
    cd /home/node/.n8n/nodes && npm install --no-progress --no-color n8n-nodes-puppeteer
    echo "n8n-nodes-puppeteer has been installed successfully"
fi

# Print banner with version information
print_banner

# Execute the original n8n docker-entrypoint.sh with all arguments
exec /docker-entrypoint.sh "$@"
