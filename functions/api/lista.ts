import { type Env, inscrever } from "../../src/lista";

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => inscrever(request, env);
