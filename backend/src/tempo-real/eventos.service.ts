import { Injectable } from '@nestjs/common';
import { Subject, type Observable } from 'rxjs';

// Assuntos que mudam e que as telas abertas precisam saber na hora (ADR 0016).
// operacao: pedidos e carros de um dia (Viagens Externas e Confirmação e Guias).
// escala: escala dos motoristas e frota do dia. cadastros: motoristas, veículos, embarques e calendário.
// padronizacao: dicionário de locais.
export type AssuntoDaMudanca = 'operacao' | 'escala' | 'cadastros' | 'padronizacao';

export interface Mudanca {
  assunto: AssuntoDaMudanca;
  // Dias atingidos, em AAAA-MM-DD. Vazio quando a mudança não é de um dia (cadastros).
  datas: string[];
  // Marcador que sobe a cada gravação. A tela compara com o que já tem para saber se precisa recarregar.
  versao: string;
  // Quem gravou, para a tela de quem gravou não recarregar o que ela mesma acabou de desenhar.
  origem: string;
}

// Avisa as telas abertas de cada mudança gravada. Uma instância só, na memória da API: a máquina de produção roda uma
// API só. Com mais de uma, o aviso passaria pelo PostgreSQL (LISTEN/NOTIFY).
@Injectable()
export class EventosService {
  private readonly mudancas = new Subject<Mudanca>();
  private contador = 0;
  private readonly inicio = Date.now().toString(36);

  versaoAtual(): string {
    return `${this.inicio}-${this.contador}`;
  }

  avisar(assunto: AssuntoDaMudanca, datas: string[], origem = ''): string {
    this.contador += 1;
    const versao = this.versaoAtual();
    this.mudancas.next({ assunto, datas: [...new Set(datas)].sort(), versao, origem });
    return versao;
  }

  acompanhar(): Observable<Mudanca> {
    return this.mudancas.asObservable();
  }
}
