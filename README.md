# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Arquitectura (código desacoplado)

Este proyecto está organizado para evitar “código espagueti”:

- UI (React): `src/components/`
	- Solo renderiza y maneja interacción/estado local de formulario.
	- No llama APIs directamente.

- Hooks (casos de uso en React): `src/hooks/`
	- Orquestan carga/errores/loading y suscripciones.
	- Consumen repositorios/servicios.

- Data (repositorios Supabase): `src/data/`
	- Aquí vive el acceso a Supabase (select/insert/update/realtime/auth).

- Services (APIs externas): `src/services/`
	- Llamadas a APIs HTTP (ej. tasas BCV/USDT).

- Usecases (lógica reutilizable): `src/usecases/`
	- Funciones de negocio que combinan repositorios (ej. guardar cambios en batch).

- Lib (helpers puros): `src/lib/`
	- Mapeos snake_case ↔ camelCase, utilidades de storage, cliente Supabase, etc.
