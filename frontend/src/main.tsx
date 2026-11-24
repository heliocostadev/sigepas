import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaginaInicial } from './PaginaInicial';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('O elemento #raiz não existe no index.html.');

createRoot(raiz).render(
  <StrictMode>
    <PaginaInicial />
  </StrictMode>,
);
