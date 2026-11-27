-- Caixa opcional "Uso Mac no consultório" (mede a procura por uma versão para Mac). 0 = não marcou.
ALTER TABLE inscricao ADD COLUMN usa_mac INTEGER NOT NULL DEFAULT 0 CHECK (usa_mac IN (0, 1));
