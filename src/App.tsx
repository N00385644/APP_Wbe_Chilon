// Composición raíz: proveedores + router. Las páginas viven en src/app/pages.
import { Providers } from './app/providers';
import { Router } from './app/router';

export default function App() {
  return (
    <Providers>
      <Router />
    </Providers>
  );
}
