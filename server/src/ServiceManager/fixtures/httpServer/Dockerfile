FROM busybox:1.37.0
RUN mkdir /www && echo '"ready"' > /www/health
CMD ["httpd", "-f", "-p", "8000", "-h", "/www"]
