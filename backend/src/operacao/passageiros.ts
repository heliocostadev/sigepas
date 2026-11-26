// Identidade e descrição de passageiro, trazidas de _idPassageiro, _mesmoPassageiro e _descDe do sistema atual.
// As telas mandam esse identificador de volta para dizer qual passageiro mudar.
import { ehMarcadorNulo } from '../regras/regras-do-setor';

export interface IdentidadeDoPassageiro {
  id: number;
  matricula: string;
  nome: string;
  chaveDoPedido: string;
}

// Matrícula, senão nome, senão a chave do pedido, senão o número da linha. Servidor vem com "-" nos dois primeiros.
export function identificarPassageiro(p: IdentidadeDoPassageiro): string {
  const matricula = ehMarcadorNulo(p.matricula) ? '' : p.matricula.trim();
  const nome = ehMarcadorNulo(p.nome) ? '' : p.nome.trim();
  if (matricula) return matricula.toUpperCase();
  if (nome) return nome.toUpperCase();
  if (p.chaveDoPedido.trim()) return `#${p.chaveDoPedido.trim()}`.toUpperCase();
  return `@${p.id}`;
}

// A tela antiga manda a matrícula ou o nome. A nova manda o identificador completo. Os dois valem.
export function ehOMesmoPassageiro(p: IdentidadeDoPassageiro, alvo: unknown): boolean {
  const texto = typeof alvo === 'string' || typeof alvo === 'number' ? String(alvo).trim() : '';
  if (!texto || ehMarcadorNulo(texto)) return p.matricula.trim() === texto && !ehMarcadorNulo(p.nome);
  return identificarPassageiro(p) === texto.toUpperCase();
}

export function descreverPassageiro(matricula: string, nome: string, servidorNome = '', servidorMatricula = ''): string {
  const m = ehMarcadorNulo(matricula) ? '' : matricula.trim();
  const n = ehMarcadorNulo(nome) ? '' : nome.trim();
  if (!m && !n) {
    const sn = ehMarcadorNulo(servidorNome) ? '' : servidorNome.trim();
    const sm = ehMarcadorNulo(servidorMatricula) ? '' : servidorMatricula.trim();
    return `Servidor${sn ? ` ${sn}` : ''}${sn && sm ? ` (mat. ${sm})` : ''}`;
  }
  return `${n || '(sem nome)'}${m ? ` (mat. ${m})` : ''}`;
}

// Nome e matrícula do servidor só valem em linha de servidor (sem nome e sem matrícula de paciente).
export function servidorDaLinha(p: { nome?: unknown; matricula?: unknown; servidorNome?: unknown; servidorMatricula?: unknown }): [string, string] {
  if (!(ehMarcadorNulo(p.nome) && ehMarcadorNulo(p.matricula))) return ['', ''];
  const nome = typeof p.servidorNome === 'string' && !ehMarcadorNulo(p.servidorNome) ? p.servidorNome.trim() : '';
  const matricula = typeof p.servidorMatricula === 'string' && !ehMarcadorNulo(p.servidorMatricula) ? p.servidorMatricula.trim() : '';
  return [nome, matricula];
}
