FROM node:20-slim

# Instala o compilador pdflatex oficial com fontes essenciais sem pacotes desnecessários
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-fonts-recommended && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY src ./src

ENV PORT=4000
ENV HOST=0.0.0.0

EXPOSE 4000

CMD ["npm", "start"]
