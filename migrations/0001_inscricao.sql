-- Lista de espera do site. Sem IP, sem nome, sem user-agent.
CREATE TABLE inscricao (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,            -- minúsculo, sem espaços
  especialidade TEXT NOT NULL,           -- código da lista fechada do formulário
  criada_em TEXT NOT NULL,               -- UTC, ISO 8601
  consentimento_versao TEXT NOT NULL,    -- versão da política aceita
  consentimento_em TEXT NOT NULL         -- UTC, ISO 8601
);

-- Códigos de saída: só o SHA-256. Cada inscrição (também a repetida) mostra um link novo,
-- e qualquer um deles apaga a inscrição; o primeiro link nunca deixa de valer.
CREATE TABLE saida (
  hash TEXT PRIMARY KEY,
  inscricao INTEGER NOT NULL REFERENCES inscricao(id) ON DELETE CASCADE
);
CREATE INDEX saida_inscricao ON saida(inscricao);
