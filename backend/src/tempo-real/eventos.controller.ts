import { Controller, Header, Sse, type MessageEvent } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { interval, map, merge, type Observable } from 'rxjs';
import { EventosService } from './eventos.service';

// A cada 25 segundos sai um sinal de vida, para o Nginx e o Caddy não fecharem a conexão parada.
export const INTERVALO_DO_SINAL_DE_VIDA = 25_000;

// Server-Sent Events: cada tela aberta mantém uma conexão aqui e recebe um evento por mudança gravada.
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @SkipThrottle()
  @Sse()
  // O Nginx não guarda a resposta em buffer: cada evento chega à tela na hora.
  @Header('X-Accel-Buffering', 'no')
  acompanhar(): Observable<MessageEvent> {
    const mudancas = this.eventos.acompanhar().pipe(map((mudanca): MessageEvent => ({ type: 'mudanca', data: mudanca })));
    const sinais = interval(INTERVALO_DO_SINAL_DE_VIDA).pipe(
      map((): MessageEvent => ({ type: 'sinal', data: { versao: this.eventos.versaoAtual() } })),
    );
    return merge(mudancas, sinais);
  }
}
