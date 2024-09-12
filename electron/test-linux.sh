# LIBGL_ALWAYS_INDIRECT=1 DISPLAY=:0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1  DEBUG=pw:browser* 
TEST_MODE=true xvfb-run --auto-servernum --server-args="-screen 0 1920x1080x24" -- npx playwright test