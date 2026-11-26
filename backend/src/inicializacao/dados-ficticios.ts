// Cadastros fictícios para a demonstração do SIGEPAS em arquitetura de servidor. Nenhum nome, placa ou telefone
// daqui existe de verdade: os nomes foram inventados e as placas usam letras que não seguem a frota do setor.
// Regra do repositório: nenhum dado real de paciente, motorista ou veículo entra aqui.

export const VEICULOS_FICTICIOS = [
  { placa: 'TST1A01', tipo: 'SPIN', capacidade: 6, propriedade: 'Público', corDeFundo: '#dbeafe' },
  { placa: 'TST1A02', tipo: 'SPIN', capacidade: 6, propriedade: 'Público', corDeFundo: '#dbeafe' },
  { placa: 'TST1A03', tipo: 'ARGO', capacidade: 4, propriedade: 'Público', corDeFundo: '#dcfce7' },
  { placa: 'TST1A04', tipo: 'MINI-BUS', capacidade: 15, propriedade: 'Público', corDeFundo: '#fef3c7' },
  { placa: 'TST1A05', tipo: 'AMBULÂNCIA', capacidade: 2, propriedade: 'Público', corDeFundo: '#fee2e2' },
  { placa: 'TST1A06', tipo: 'FURGÃO LACEN', capacidade: 0, propriedade: 'Público', corDeFundo: '#ede9fe' },
  { placa: 'TST2B01', tipo: 'SPIN', capacidade: 6, propriedade: 'Terceirizado', corDeFundo: '#e0f2fe' },
  { placa: 'TST2B02', tipo: 'VAN', capacidade: 12, propriedade: 'Terceirizado', corDeFundo: '#ffedd5' },
];

export const MOTORISTAS_FICTICIOS = [
  { nome: 'ANTÔNIO FICTÍCIO DA SILVA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'BEATRIZ EXEMPLO SOUZA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'CARLOS TESTE PEREIRA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'DANIELA DEMONSTRAÇÃO LIMA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'EDUARDO MODELO COSTA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'FERNANDA AMOSTRA ROCHA', vinculo: 'Servidor', placaVinculada: '' },
  { nome: 'GUSTAVO TERCEIRO ALVES', vinculo: 'Terceirizado', placaVinculada: 'TST2B01' },
  { nome: 'HELENA CONTRATO RIBEIRO', vinculo: 'Terceirizado', placaVinculada: 'TST2B02' },
];

export const LOCAIS_DE_EMBARQUE_FICTICIOS = [
  { nome: 'Secretaria da Saúde', padrao: true },
  { nome: 'Terminal Central', padrao: false },
  { nome: 'Endereço do paciente', padrao: false },
];

// Destinos fora de Joinville que o arquivo de exemplo usa, já padronizados.
export const PADRONIZACOES_FICTICIAS = [
  { cidade: 'FLORIANÓPOLIS', local: 'HOSPITAL REGIONAL DE EXEMPLO' },
  { cidade: 'CURITIBA', local: 'CLÍNICA DE DEMONSTRAÇÃO' },
  { cidade: 'BLUMENAU', local: 'CENTRO DE ESPECIALIDADES MODELO' },
  { cidade: 'ITAJAÍ', local: 'HOSPITAL FICTÍCIO DO LITORAL' },
];
