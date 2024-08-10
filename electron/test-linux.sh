# LIBGL_ALWAYS_INDIRECT=1 DISPLAY=:0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 
TEST_MODE=true DEBUG=pw:browser* xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" -- npx playwright test