import { firstValueFrom, take, toArray } from 'rxjs';
import { EventosController, INTERVALO_DO_SINAL_DE_VIDA } from './eventos.controller';
import { EventosService } from './eventos.service';

describe('tempo real entre as telas', () => {
  it('cada mudança gravada sobe a versão e chega a quem acompanha, com as datas sem repetição', async () => {
    const eventos = new EventosService();
    const antes = eventos.versaoAtual();
    const recebida = firstValueFrom(eventos.acompanhar());
    const versao = eventos.avisar('operacao', ['2026-12-02', '2026-12-01', '2026-12-02'], 'Operador');
    expect(versao).not.toBe(antes);
    expect(await recebida).toEqual({ assunto: 'operacao', datas: ['2026-12-01', '2026-12-02'], versao, origem: 'Operador' });
  });

  it('o canal de eventos entrega a mudança e o sinal de vida', async () => {
    vi.useFakeTimers();
    const eventos = new EventosService();
    const controlador = new EventosController(eventos);
    const primeiros = firstValueFrom(controlador.acompanhar().pipe(take(2), toArray()));
    eventos.avisar('cadastros', []);
    vi.advanceTimersByTime(INTERVALO_DO_SINAL_DE_VIDA);
    const [mudanca, sinal] = await primeiros;
    expect(mudanca).toMatchObject({ type: 'mudanca', data: { assunto: 'cadastros' } });
    expect(sinal).toMatchObject({ type: 'sinal', data: { versao: eventos.versaoAtual() } });
    vi.useRealTimers();
  });
});
