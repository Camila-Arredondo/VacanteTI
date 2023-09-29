const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");

const uriMongo = "CONEXIONMONGODB";
const urlusuarios = "https://jsonplaceholder.typicode.com/users";
const urlcomentario = "https://jsonplaceholder.typicode.com/comments";
const bdmongo = "cluster4";

const client = new MongoClient(uriMongo, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

(async () => {
  //Obtenemos todos los usuarios desde la API
  const usuarios = await axios.get(urlusuarios);

  //Filtros por los usuarios que tengan 3 o más vocales
  const usuariosfiltrados = usuarios.data.filter((x) =>
    tieneCantidadVocales(x.username, 3)
  );

  // Guardamos en mongoDB los usuarios filtrados
  await guardarUsuarioMongoDB(usuariosfiltrados);

  //Obtenemos todos los comentarios desde la API
  const comentarios = await axios.get(urlcomentario);

  //Filtrar por unicamente los post de los usuarios filtrados
  /*  const comentariosFiltrados = comentarios.data.filter((x) => {
       usuariosfiltrados.some((user) => user.email == x.email);
     });
  */

  // Guardamos los comentarios en MongoDB
  await guardarComentarioMongoDB(comentarios.data);
  //Obtener datos filtrados desde mongo y mostrarlos en la consola con los 3 más repetidos
  console.log(await obtenerComentariosMongoTopN(3));

  //Obtener todos los datos de mongo y usando javascript obtengo lo requerido
  /*const comentariosMongo = await obtenerComentarioMongoDB();
  console.log(palabrasMasRepetidas(comentariosMongo, 3))
  */
})();

async function guardarUsuarioMongoDB(usuarios) {
  await client.db(bdmongo).collection("users").insertMany(usuarios);
}

async function guardarComentarioMongoDB(comentarios) {
  await client.db(bdmongo).collection("comments").insertMany(comentarios);
}

async function obtenerComentarioMongoDB() {
  return await client.db(bdmongo).collection("comments").find({}).toArray();
}

async function obtenerComentariosMongoTopN(limite) {
  var datos = await client
    .db(bdmongo)
    .collection("comments")
    .aggregate([
      {
        $addFields: {
          body: {
            $replaceAll: {
              input: "$body",
              find: "\n",
              replacement: " ",
            },
          },
        },
      },
      {
        $project: {
          palabras: { $split: ["$body", " "] },
        },
      },
      {
        $unwind: "$palabras",
      },
      {
        $group: {
          _id: "$palabras",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limite,
      },
    ]);

  return datos.toArray();
}

function tieneCantidadVocales(texto, cantidad) {
  const vocales = "aeiouAEIOUáéíóúÁÉÍÓÚ";
  let conteoVocales = 0;

  for (let i = 0; i < texto.length; i++) {
    if (vocales.includes(texto[i])) {
      conteoVocales++;
    }
    if (conteoVocales >= cantidad) {
      return true;
    }
  }
  return false;
}

function palabrasMasRepetidas(comentarios, limite) {
  var todasLasPalabras = comentarios.flatMap((x) =>
    x.body.replaceAll("\n", " ").split(" ")
  );

  let agrupadas = {};
  for (let i = 0; i < todasLasPalabras.length; i++) {
    let item = todasLasPalabras[i];
    if (!agrupadas[item]) {
      agrupadas[item] = 0;
    }
    agrupadas[item]++;
  }
  var orden = [];
  for (let palabra in agrupadas) {
    orden.push({
      palabra: palabra,
      cantidad: agrupadas[palabra],
    });
  }
  orden.sort((a, b) => b.cantidad - a.cantidad);

  if (limite) {
    orden = orden.slice(0, limite);
  }
  return orden;
}
