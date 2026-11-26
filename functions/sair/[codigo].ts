import { type Env, sair } from "../../src/lista";

// GET mostra a confirmação; só o POST apaga (pré-visualizações de link não tiram ninguém da lista).
export const onRequestGet: PagesFunction<Env> = ({ request, env }) => sair(request, env);
export const onRequestPost: PagesFunction<Env> = ({ request, env }) => sair(request, env);
