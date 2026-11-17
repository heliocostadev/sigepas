import { render, screen } from '@testing-library/react';
import { PaginaInicial } from './PaginaInicial';

describe('PaginaInicial', () => {
  it('mostra o nome do sistema como título principal', () => {
    render(<PaginaInicial />);
    expect(screen.getByRole('heading', { level: 1, name: 'SIGEPAS' })).toBeInTheDocument();
  });

  it('explica a sigla para quem não conhece o sistema', () => {
    render(<PaginaInicial />);
    expect(screen.getByText('Sistema de Gestão de Transportes de Pacientes e Servidores')).toBeInTheDocument();
  });

  it('tem uma região principal, para quem navega com leitor de tela', () => {
    render(<PaginaInicial />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
