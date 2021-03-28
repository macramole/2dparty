Acá se pushearán los cambios y Leandro después mergeará a master para subir a heroku.

# Desarrollo:

## Clonar el repositorio:

Este es un repositorio de git, lo podes clonar via `git` (si tenes `git` instalado) con el comando
```bash
git clone https://github.com/macramole/2dparty.git
```
o te lo podes descargar directamente en https://github.com/macramole/2dparty bajo el botón **code**.

## Requisitos:

1. Tener instalado [`node.js`]("https://nodejs.org/es/") (Recomendación, instalar la versión LTS. Si tu sistema operativo es Linux o Mac y te llevás bien con la terminal, te puede servir muchísimo [`nvm`]("https://github.com/nvm-sh/nvm") para instalar y manejar distintas versiones de `node`).

2. Correr el comando de instalación de los paquetes: `npm install`.

## Comandos

* `npm start`: Inicializa el servidor en el puerto 3000.
* `npm run sass`: Compila los estilos de sass.
* `npm run dev`: Compila los estilos de sass y después inicializa el servidor en el puerto 3000.
