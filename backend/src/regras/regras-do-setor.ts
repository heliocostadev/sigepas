// Regras de negócio puras, trazidas do SIGEPAS em Apps Script (codigo.gs) sem as limitações da planilha.
// Cada função diz de qual função do sistema atual veio, para a conferência lado a lado.

// _normalizarTextoLocal: sem acento, maiúsculo, espaços colapsados. Base de toda comparação de texto.
export function normalizarTexto(valor: unknown): string {
  const texto = typeof valor === 'string' ? valor : valor === null || valor === undefined ? '' : String(valor);
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

// _chaveLocal: chave da dupla cidade e local no dicionário. O separador \x1f nunca aparece num texto digitado.
export function chaveDoLocal(cidade: string, local: string): string {
  return `${normalizarTexto(cidade)}\x1f${normalizarTexto(local)}`;
}

function completarComZeroAEsquerda(valor: string | number): string {
  const numero = Number.parseInt(String(valor), 10);
  return String(Number.isNaN(numero) ? 0 : numero).padStart(2, '0');
}

// _normalizarHora: "10" vira "10:00", "9h30" vira "09:30", "930" vira "09:30", vazio vira "00:00".
export function normalizarHora(valor: unknown): string {
  let hora = typeof valor === 'string' ? valor.trim() : valor === null || valor === undefined ? '' : String(valor).trim();
  if (!hora) return '00:00';
  hora = hora.replace(/h/gi, ':');
  if (hora.includes(':')) {
    const [horas = '', minutos = ''] = hora.split(':');
    return `${completarComZeroAEsquerda(horas)}:${completarComZeroAEsquerda(minutos)}`;
  }
  if (/^\d{1,2}$/.test(hora)) return `${completarComZeroAEsquerda(hora)}:00`;
  if (/^\d{3}$/.test(hora)) return `${completarComZeroAEsquerda(hora.slice(0, 1))}:${hora.slice(1)}`;
  if (/^\d{4}$/.test(hora)) return `${hora.slice(0, 2)}:${hora.slice(2)}`;
  return hora;
}

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

// Data do arquivo do OLOSTECH para AAAA-MM-DD. Aceita "27 de nov. de 2026", "2026-11-27" e "27/11/2026 08:00".
// Devolve "" quando não reconhece o formato.
export function dataParaISO(valor: unknown): string {
  const texto = normalizarTexto(valor).toLowerCase().replace(/\./g, '');
  let dia: number;
  let mes: number;
  let ano: number;
  const porExtenso = /^(\d{1,2}) de ([a-zç]{3})[a-zç]* de (\d{4})$/.exec(texto);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(texto);
  const brasileira = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(texto);
  if (porExtenso) {
    dia = Number(porExtenso[1]);
    mes = MESES[porExtenso[2] ?? ''] ?? 0;
    ano = Number(porExtenso[3]);
  } else if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]);
    dia = Number(iso[3]);
  } else if (brasileira) {
    dia = Number(brasileira[1]);
    mes = Number(brasileira[2]);
    ano = Number(brasileira[3]);
  } else {
    return '';
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (mes < 1 || data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return '';
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isoParaBR(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// _ehJoinville
export function ehJoinville(cidade: unknown): boolean {
  return normalizarTexto(cidade) === 'JOINVILLE';
}

// _ehMarcadorNulo: nome ou matrícula vazios, "-", "N/A" ou "Não informado" (pedido de servidor).
export function ehMarcadorNulo(valor: unknown): boolean {
  return ['', '-', 'N/A', 'NA', 'NAO INFORMADO', 'SEM INFORMACAO'].includes(normalizarTexto(valor));
}

// _servidorPedeMotorista: o tipo de veículo pedido exige motorista?
export function servidorPedeMotorista(tipo: unknown): boolean {
  const texto = normalizarTexto(tipo);
  if (texto.includes('SEM MOTORISTA')) return false;
  if (texto.includes('COM MOTORISTA')) return true;
  if (texto.startsWith('AMBUL')) return true;
  return ` ${texto} `.includes(' VAN ');
}

// _ehDemandaInterna: o pedido é da remoção interna (fora do escopo desta entrega) e não entra na fila de viagens
// externas. Destino em Joinville, ou pedido de servidor que não pede motorista.
export function ehDemandaInterna(pedido: { cidade: string; matricula: string; nomePaciente: string; tipoVeiculo: string }): boolean {
  if (ehJoinville(pedido.cidade)) return true;
  const ehDeServidor = ehMarcadorNulo(pedido.matricula) && ehMarcadorNulo(pedido.nomePaciente);
  if (!ehDeServidor) return false;
  return !servidorPedeMotorista(pedido.tipoVeiculo);
}

// _hashTexto: djb2 de 32 bits, em 8 dígitos hexadecimais. Identifica, não protege.
export function resumirTexto(texto: string): string {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) {
    // charCodeAt, e não codePointAt, para dar a mesma chave que o sistema atual.
    hash = (Math.imul(hash, 33) ^ texto.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

export interface CompromissoDoPedido {
  data: string;
  cidade: string;
  hora: string;
  localDestino: string;
  objetivo: string;
  matricula: string;
  nomePaciente: string;
  quantidadePessoas: number | string;
}

// _chaveDemanda: a impressão digital das oito colunas do compromisso (ADR 0010). A partir da segunda ocorrência
// idêntica no mesmo dia, a chave ganha o número da ocorrência.
export function chaveDoPedido(pedido: CompromissoDoPedido, ocorrencia = 1): string {
  const partes = [
    pedido.data,
    pedido.cidade,
    pedido.hora,
    pedido.localDestino,
    pedido.objetivo,
    pedido.matricula,
    pedido.nomePaciente,
    String(pedido.quantidadePessoas),
  ].map(normalizarTexto);
  const base = `D-${resumirTexto(partes.join('\x1f'))}`;
  return ocorrencia > 1 ? `${base}-${ocorrencia}` : base;
}

// _levenshtein, com teto de tamanho: um texto gigante não trava o servidor (achado da revisão de segurança de 23/11).
export const TAMANHO_MAXIMO_PARA_COMPARAR = 200;

export function distanciaDeEdicao(a: string, b: string): number {
  const x = a.slice(0, TAMANHO_MAXIMO_PARA_COMPARAR);
  const y = b.slice(0, TAMANHO_MAXIMO_PARA_COMPARAR);
  if (x === y) return 0;
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let anterior = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const atual = [i];
    for (let k = 1; k <= y.length; k++) {
      const custo = x[i - 1] === y[k - 1] ? 0 : 1;
      atual[k] = Math.min((atual[k - 1] ?? 0) + 1, (anterior[k] ?? 0) + 1, (anterior[k - 1] ?? 0) + custo);
    }
    anterior = atual;
  }
  return anterior[y.length] ?? 0;
}

// _similaridadeLocais: 1 é igual, 0 é nada em comum.
export function similaridade(a: string, b: string): number {
  const x = normalizarTexto(a);
  const y = normalizarTexto(b);
  if (!x || !y) return 0;
  return 1 - distanciaDeEdicao(x, y) / Math.max(x.length, y.length, 1);
}

// Utilities.parseCsv: lê o CSV com aspas, aspas dobradas e quebras de linha dentro de campo.
export function lerCsv(conteudo: string, separador: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let entreAspas = false;
  // O Excel grava a marca de ordem de bytes (BOM, U+FEFF) no começo do arquivo.
  const texto = conteudo.codePointAt(0) === 0xfeff ? conteudo.slice(1) : conteudo;
  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i];
    if (entreAspas) {
      if (caractere === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (caractere === '"') {
        entreAspas = false;
      } else {
        campo += caractere;
      }
    } else if (caractere === '"') {
      entreAspas = true;
    } else if (caractere === separador) {
      linha.push(campo);
      campo = '';
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }
  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''));
}

// O separador é o que mais aparece entre vírgula e ponto e vírgula, como no sistema atual.
export function escolherSeparador(conteudo: string): string {
  const virgulas = (conteudo.match(/,/g) ?? []).length;
  const pontosEVirgulas = (conteudo.match(/;/g) ?? []).length;
  return pontosEVirgulas > virgulas ? ';' : ',';
}

// "Joinville > A > B" vira ["A", "B"].
export function roteiroDoTexto(texto: string): string[] {
  const paradas = texto.split('>').map((parte) => parte.trim()).filter(Boolean);
  if (paradas.length && ehJoinville(paradas[0])) paradas.shift();
  return paradas;
}
