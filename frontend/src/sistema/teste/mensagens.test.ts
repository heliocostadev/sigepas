// Funções que as telas dividem: idade e alertas do Código de Trânsito, aviso urgente do carro, janela de cancelar
// paciente e o texto das mensagens (ao motorista e ao paciente). Dados fictícios.
import { carregarTelas, tela } from './preparar-telas';

const CARRO = {
  motoristaAtribuido: 'ANTÔNIO FICTÍCIO',
  motorista2: 'BEATRIZ EXEMPLO',
  doisMotoristas: true,
  roteiro: ['itajaí', 'florianópolis'],
  horaEmbarque: '04:30',
  localEmbarque: 'Secretaria da Saúde',
  aviso: 'Levar a cadeira de rodas\nPassar na UBSF antes',
  passageiros: [
    { hora: '09:00', nome: 'MARIA FICTÍCIA', matricula: '900001', local: 'hospital regional', cidade: 'florianópolis', nascimento: '1950-01-01', acompanhante: 'JOSÉ ACOMPANHANTE', telefones: '(00) 0000-0001', telefonesAcomp: '(00) 0000-0002', enderecoEmbarque: 'Endereço do paciente', enderecoResidencia: 'Rua Fictícia, 10', observacao: 'Cadeirante', quantidade: 2 },
    { hora: '07:00', nome: 'BEBÊ FICTÍCIO', matricula: '900002', local: 'clínica', cidade: 'itajaí', nascimento: new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10), acompanhante: '', telefones: '', enderecoEmbarque: '', observacao: 'nenhuma', quantidade: 1 },
  ],
};

describe('mensagens e utilidades comuns das telas', () => {
  beforeAll(carregarTelas);

  it('caminho do roteiro com o destino em destaque', () => {
    expect(tela.formatarCaminhoRoteiroHTML([])).toBe('Joinville');
    expect(tela.formatarCaminhoRoteiroHTML(['Itajaí', '', 'Florianópolis'])).toBe('Joinville › Itajaí › <span class="cv-rota-destino">Florianópolis</span>');
    expect(tela.formatarCaminhoRoteiroHTML('não é lista')).toBe('Joinville');
  });

  it('idade e alertas do Código de Trânsito por faixa', () => {
    const anosAtras = (anos: number) => new Date(Date.now() - anos * 365.25 * 86_400_000).toISOString().slice(0, 10);
    const rotulos = (p: object) => tela.regrasIdade(p).map((a: { label: string }) => a.label);
    expect(tela.calcularIdade('').semData).toBe(true);
    expect(tela.calcularIdade('data errada').semData).toBe(true);
    expect(rotulos({ nascimento: '' })).toEqual([]);
    expect(rotulos({ nascimento: anosAtras(0.5) })).toEqual(['Bebê Conforto']);
    expect(rotulos({ nascimento: anosAtras(2) })).toEqual(['Cadeirinha']);
    expect(rotulos({ nascimento: anosAtras(5) })).toEqual(['Assento de Elevação']);
    expect(rotulos({ nascimento: anosAtras(8) })).toEqual(['Cinto 3 pontos']);
    expect(rotulos({ nascimento: anosAtras(70), acompanhante: 'Filha' })).toEqual(['Idoso (acompanhante OK)']);
    expect(rotulos({ nascimento: anosAtras(70), acompanhante: '', quantidade: 1 })).toEqual(['IDOSO SEM ACOMPANHANTE']);
    expect(tela.nivelMaisAlto([{ nivel: 'info' }, { nivel: 'perigo' }])).toBe('perigo');
    expect(tela.nivelMaisAlto([{ nivel: 'aviso' }])).toBe('aviso');
    expect(tela.nivelMaisAlto([{ nivel: 'info' }])).toBe('info');
    expect(tela.nivelMaisAlto([])).toBe('');
  });

  it('restrição de verdade, relógio da hora e título das palavras', () => {
    expect(tela.temRestricaoReal('')).toBe(false);
    expect(tela.temRestricaoReal(' Nenhuma ')).toBe(false);
    expect(tela.temRestricaoReal('Cadeirante')).toBe(true);
    expect(tela.relogioEmoji('13:00')).toBe('🕐');
    expect(tela.relogioEmoji('13:45')).toBe('🕜');
    expect(tela.relogioEmoji('')).toBe('🕛');
    expect(tela.tituloMsg('  HOSPITAL  regional ')).toBe('Hospital  Regional');
    expect(tela.tituloMsg(null)).toBe('');
  });

  it('aviso urgente do carro aparece escapado e só quando existe', () => {
    expect(tela.cvAvisoSeloHTML(null)).toBe('');
    expect(tela.cvAvisoSeloHTML({ aviso: '  ' })).toBe('');
    expect(tela.cvAvisoSeloHTML({ aviso: '<b>"x"</b>' })).toContain('title="&lt;b&gt;&quot;x&quot;&lt;/b&gt;"');
    expect(tela.cvAvisoFaixaHTML({ aviso: '' })).toBe('');
    expect(tela.cvAvisoFaixaHTML({ aviso: 'Levar ficha', avisoRegistro: '26/11/2026 10:00 · Gestora' })).toContain('Registrado em 26/11/2026 10:00 · Gestora');
    expect(tela.cvAvisoFaixaHTML({ aviso: 'Levar ficha' })).not.toContain('Registrado em');
  });

  it('janela de cancelar paciente exige justificativa e diz quem cancelou', () => {
    const area = document.createElement('div');
    area.innerHTML = tela.cancelamentoCamposHTML('teste', 'MARIA <FICTÍCIA>', '');
    document.body.appendChild(area);
    expect(area.textContent).toContain('MARIA <FICTÍCIA>');
    // Sem Lista de Tarefas nem envio ao sistema da prefeitura no ar: o texto diz só o que o servidor faz.
    expect(area.textContent).toContain('Ele sai do carro e libera a vaga. O motivo fica registrado na confirmação.');
    // Os campos servem também à demanda digitada à mão, que o servidor apaga sem guardar a justificativa.
    expect(area.textContent).toContain('Justificativa (obrigatória)');
    expect(area.textContent).not.toContain('fica registrada no cancelamento');
    expect(area.textContent).not.toContain('Lista de Tarefas');
    expect(tela.cancelamentoLer('teste')).toBeNull();
    expect(document.getElementById('toastArea')?.textContent).toContain('Descreva a justificativa do cancelamento.');
    (document.getElementById('testeJustif') as HTMLTextAreaElement).value = 'Internada';
    expect(tela.cancelamentoLer('teste')).toEqual({ motivo: 'Paciente cancelou', justificativa: 'Internada', texto: 'Paciente cancelou: Internada' });
    expect(tela.cancelamentoLer('sem-campos')).toBeNull();
    expect(tela.cancelamentoMarca('posto')).toBe('cancelado pela UBSF');
    expect(tela.cancelamentoMarca('qualquer')).toBe('cancelado');
    area.remove();
  });

  it('mensagem ao motorista: aviso primeiro, os dois motoristas, rota, passageiros por hora e alertas', () => {
    const msg = tela.gerarMensagemWhatsapp(structuredClone(CARRO), '2026-11-27', 'BEATRIZ EXEMPLO');
    expect(msg.startsWith('Olá, BEATRIZ EXEMPLO! Tudo bem?')).toBe(true);
    expect(msg).toContain('para o dia 27/11');
    expect(msg).toContain('🚨 *AVISO URGENTE:*\n*Levar a cadeira de rodas*\n*Passar na UBSF antes*');
    expect(msg).toContain('*MOTORISTAS:* ANTÔNIO FICTÍCIO (ida) e BEATRIZ EXEMPLO (volta)');
    expect(msg).toContain('*ROTA:* Joinville -> Itajaí -> Florianópolis');
    expect(msg.indexOf('BEBÊ FICTÍCIO')).toBeLessThan(msg.indexOf('MARIA FICTÍCIA'));
    expect(msg).toContain('Embarque: Rua Fictícia, 10');
    expect(msg).toContain('Tel. Acompanhante:');
    expect(msg).toContain('⚠️ Cadeirante');
    expect(msg).toContain('⚠️ Bebê Conforto');
    expect(msg).toContain('Sem acompanhante');
    const simples = tela.gerarMensagemWhatsapp({ destino: 'curitiba', passageiros: [] }, '', '');
    expect(simples).toContain('Olá, MOTORISTA!');
    expect(simples).toContain('*ROTA:* Joinville -> Curitiba');
    expect(simples).toContain('*SAÍDA:* --:--');
    expect(tela.gerarMensagemWhatsapp({ passageiros: [] }, '', '')).toContain('*ROTA:* Joinville\n');
  });

  it('mensagem ao paciente: embarque da Secretaria pelo horário, período do dia e endereço de casa', () => {
    const p = structuredClone(CARRO.passageiros[0]);
    const v = structuredClone(CARRO);
    const cedo = tela.gerarMensagemPacienteWhatsapp({ ...p, enderecoEmbarque: '' }, v, '2026-11-27');
    expect(cedo).toContain('*Data:* 27/11/2026');
    expect(cedo).toContain('*Destino:* FLORIANÓPOLIS — HOSPITAL REGIONAL');
    expect(cedo).toContain('*Saída do veículo:* 04:30 da manhã');
    expect(cedo).toContain('entrada lateral');
    expect(cedo).not.toContain('Link do Mapa');
    const tarde = tela.gerarMensagemPacienteWhatsapp({ ...p, enderecoEmbarque: '' }, { ...v, horaEmbarque: '13:00' }, '2026-11-27');
    expect(tarde).toContain('13:00 da tarde');
    expect(tarde).toContain('em frente ao prédio');
    expect(tela.gerarMensagemPacienteWhatsapp(p, { ...v, horaEmbarque: '19:00' }, '')).toContain('*Local de embarque:* Rua Fictícia, 10');
    expect(tela.gerarMensagemPacienteWhatsapp({ ...p, cidade: '', local: '' }, { roteiro: ['Blumenau'], horaEmbarque: '' }, '')).toContain('*Destino:* BLUMENAU');
    expect(tela.wppPeriodoDoDia('19:00')).toBe('da noite');
    expect(tela.wppPeriodoDoDia('')).toBe('');
    expect(tela.wppEmbarqueSecretaria('Terminal Central', '05:00')).toBeNull();
  });

  it('mensagens da remoção interna (fora desta entrega) continuam montando o texto', () => {
    const recusa = tela.gerarMensagemRecusaInterna({ nome: 'Maria', data: '27/11/2026', destino: 'Policlínica' }, 'Sem carro');
    expect(recusa).toContain('Olá, Maria.');
    expect(recusa).toContain('para *Policlínica* no dia *27/11/2026*');
    expect(recusa).toContain('Motivo: Sem carro');
    expect(tela.gerarMensagemRecusaInterna(null, '')).toContain('Olá. Aqui é do Setor de Transportes');
    const interna = tela.gerarMensagemInternaWhatsapp({ nome: 'Maria', data: '27/11/2026', horaSaida: '07:00', origem: 'Centro', destino: 'Policlínica' });
    expect(interna).toContain('Horário de saída do veículo: 07:00 da manhã');
    expect(interna).toContain('Trajeto: Centro → Policlínica');
    expect(tela.gerarMensagemInternaWhatsapp(null)).toContain('a confirmar');
  });
});
