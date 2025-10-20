cd e2e
PW_TEST_HTML_REPORT_OPEN='never' npx playwright test demo_video.spec.ts --headed &
ffmpeg \
  -video_size 1280x1080 \
  -framerate 24 \
  -f x11grab -i :0.0+3275,+118 \
  -pix_fmt yuv444p \
  -c:v libx264rgb \
  -crf 0 \
  -preset ultrafast \
  ./demo/video.mp4 \
  -y

