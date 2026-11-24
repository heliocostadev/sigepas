// Decidem o que entra em cada linha de log. A regra é de lista de permitidos: entra só o que está aqui. Quando os
// fluxos receberem dados de paciente, nome, telefone ou matrícula na URL e nos cabeçalhos não chegam ao log (LGPD).
// O endereço IP do cliente também fica de fora, porque é dado pessoal e o prazo de guarda ainda não foi definido.

interface RequisicaoRecebida {
  id?: unknown;
  method?: string;
  url?: string;
  headers?: Record<string, unknown>;
  remoteAddress?: string;
}

interface RespostaEnviada {
  statusCode?: number;
  headers?: Record<string, unknown>;
}

const ENDERECOS_FORA_DO_LOG = ['/saude'];

function caminhoSemQuery(url: string | undefined): string {
  return (url ?? '').split('?')[0] ?? '';
}

export function formatarRequisicaoParaLog(requisicao: RequisicaoRecebida): Record<string, unknown> {
  return { id: requisicao.id, metodo: requisicao.method, caminho: caminhoSemQuery(requisicao.url) };
}

export function formatarRespostaParaLog(resposta: RespostaEnviada): Record<string, unknown> {
  return { status: resposta.statusCode };
}

// O monitor de disponibilidade consulta /saude o tempo todo. Uma linha por consulta só encheria o log. As métricas
// não aparecem aqui porque ficam no servidor interno, fora da API pública.
export function deveFicarForaDoLog(url: string | undefined): boolean {
  return ENDERECOS_FORA_DO_LOG.includes(caminhoSemQuery(url));
}
