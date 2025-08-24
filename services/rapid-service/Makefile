.PHONY: install test start docker-build docker-run
install:
	npm install

test:
	npm test

start:
	npm start

docker-build:
	docker build -t rapid-service .

docker-run:
	docker run --rm -p 3000:3000 rapid-service
