"""Genera o valida los materiales PDF de los temarios de CódigoClaro.

Las rutas de entrada y salida se resuelven respecto al proyecto para facilitar
la ejecución desde distintas carpetas de trabajo.
"""

#!/usr/bin/env python3
"""Genera los PDF didácticos desde el catálogo de temas. Las funciones separan la preparación del contenido, el formato y la escritura de los archivos."""
"""Genera los 75 temarios de CódigoClaro a partir del catálogo versionado.

Las explicaciones son síntesis didácticas en español basadas en documentación primaria enlazada en cada PDF. Se atribuyen las fuentes a sus equipos responsables; consulta la versión actual antes de reutilizar ejemplos.
"""
from pathlib import Path
import json, re
import shutil
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Preformatted, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
CATALOG = PUB / 'catalogo_temas.json'

REFS = {
 'Java': [('Dev.java: tutoriales para aprender Java', 'https://dev.java/learn/'), ('Oracle: Java SE 25 Language Specification', 'https://docs.oracle.com/javase/specs/jls/se25/html/index.html')],
 'JavaScript': [('MDN: JavaScript Guide, MDN Contributors', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide'), ('Ecma International: ECMAScript specification', 'https://tc39.es/ecma262/')],
 'Python': [('Python Software Foundation: Python Tutorial', 'https://docs.python.org/3/tutorial/'), ('Python Software Foundation: Standard Library', 'https://docs.python.org/3/library/')],
 'Kotlin': [('JetBrains: Kotlin Documentation', 'https://kotlinlang.org/docs/home.html'), ('JetBrains: Kotlin Standard Library', 'https://kotlinlang.org/api/latest/jvm/stdlib/')],
 'React': [('React Team: Learn React', 'https://react.dev/learn'), ('React Team: API Reference', 'https://react.dev/reference/react')],
}

SOURCE_OWNERS = {
 'Java': 'Oracle y OpenJDK',
 'JavaScript': 'MDN Contributors y Ecma International',
 'Python': 'Python Software Foundation',
 'Kotlin': 'JetBrains',
 'React': 'el equipo de React',
}

TOPIC = {
 'Java': {
  'Instalación y primer programa': ('JDK, JRE y JVM cumplen funciones distintas: el JDK incluye herramientas de desarrollo; la JVM ejecuta bytecode; la disponibilidad concreta de un JRE separado depende de la distribución. El flujo habitual es escribir .java, compilar a .class y ejecutar con java.', 'javac Hola.java\njava Hola', 'Comprueba `java -version` y `javac -version` por separado. Si el primer comando funciona y el segundo no, revisa el JDK y PATH.'),
  'Variables y tipos': ('Java es estático y nominal: las variables tienen tipo declarado, los primitivos guardan valores y las referencias apuntan a objetos. Una variable local debe inicializarse antes de leerse; los campos reciben valores por defecto.', 'int intentos = 3;\ndouble precio = 12.50;\nString nombre = "Ada";\nfinal int MAX_INTENTOS = 5;', 'Distingue conversión de ampliación y estrechamiento. Un cast puede perder información; parsear texto puede lanzar NumberFormatException.'),
  'Operadores y expresiones': ('Los operadores aritméticos, relacionales, lógicos y de asignación construyen expresiones. `&&` y `||` cortocircuitan; la precedencia afecta a la lectura, por lo que los paréntesis hacen explícita la intención.', 'boolean valido = edad >= 18 && tienePermiso;\nint resto = 17 % 5; // 2', 'No compares String con == para comparar contenido; usa equals. Cuidado con división entera y con desbordamientos de enteros.'),
  'Condicionales': ('if/else expresa decisiones; switch permite seleccionar entre alternativas. En switch moderno, las expresiones pueden producir un valor. La sintaxis disponible depende de la versión de Java configurada.', 'String tipo = switch (nota) {\n  case 9, 10 -> "sobresaliente";\n  case 7, 8 -> "notable";\n  default -> "revisar";\n};', 'Define qué ocurre con cada rango y evita condiciones solapadas o huecos. Prueba valores en los límites de cada intervalo.'),
  'Bucles': ('for es útil cuando el recorrido o número de iteraciones es conocido; while repite mientras una condición sea cierta; do-while ejecuta al menos una vez. break termina el bucle y continue salta a la siguiente iteración.', 'for (int i = 0; i < 5; i++) {\n  System.out.println(i);\n}', 'Verifica inicialización, condición y actualización. Un bucle que no progresa puede ser infinito; un límite incorrecto causa errores de uno más/uno menos.'),
  'Arrays': ('Un array tiene longitud fija y sus índices empiezan en cero. Los elementos de un array de referencias pueden ser null; el acceso fuera de rango provoca ArrayIndexOutOfBoundsException.', 'int[] notas = {7, 8, 10};\nfor (int nota : notas) {\n  System.out.println(nota);\n}', 'Usa length, no length(). Distingue copiar una referencia de copiar los elementos; Arrays.copyOf crea otro array.'),
  'Métodos': ('Un método define una operación con nombre, parámetros y tipo de retorno. La firma participa en la sobrecarga; el tipo de retorno por sí solo no permite sobrecargar. Java pasa argumentos por valor, incluidas las referencias.', 'static int sumar(int a, int b) {\n  return a + b;\n}', 'Divide operaciones grandes en métodos con una responsabilidad. Comprueba precondiciones y documenta qué devuelve y qué errores puede producir.'),
  'Clases y objetos': ('Una clase describe estado y comportamiento; un objeto es una instancia. Encapsular significa proteger invariantes y exponer operaciones claras. Los modificadores de acceso forman parte del diseño de la API.', 'class Contador {\n  private int valor;\n  void incrementar() { valor++; }\n  int valorActual() { return valor; }\n}', 'Evita campos públicos mutables por defecto. Decide qué estado debe ser visible y qué condiciones deben mantenerse siempre.'),
  'Constructores y this': ('El constructor inicializa una instancia y no tiene tipo de retorno. `this` refiere al objeto actual y puede resolver nombres; `this(...)` delega en otro constructor de la misma clase. Desde Java 25, ciertas instrucciones de preparación o validación pueden preceder a la invocación explícita, pero no pueden acceder a la instancia aún en construcción. En versiones anteriores, la invocación debe aparecer al inicio.', 'class Usuario {\n  private final String nombre;\n  Usuario(String nombre) { this.nombre = nombre; }\n}', 'Valida argumentos al crear el objeto. Evita duplicar lógica entre constructores; delega en un constructor principal cuando sea claro.'),
  'Herencia y polimorfismo': ('extends crea una relación de herencia de clases; una subclase especializa el comportamiento. La sobrescritura debe respetar el contrato de la clase base. El despacho dinámico elige la implementación según el objeto real.', 'class Animal { void hablar() { System.out.println("..."); } }\nclass Perro extends Animal { @Override void hablar() { System.out.println("Guau"); } }', 'Prefiere composición cuando no existe una relación genuina “es-un”. No reduzcas visibilidad al sobrescribir y respeta el principio de sustitución.'),
  'Interfaces y abstractas': ('Una interfaz define un contrato que distintas clases pueden implementar. Una clase abstracta puede combinar estado y comportamiento compartido. Las interfaces permiten implementar varios contratos, mientras que una clase solo extiende una clase.', 'interface Exportable {\n  String exportar();\n}\nclass Informe implements Exportable {\n  public String exportar() { return "{}"; }\n}', 'Programa contra abstracciones cuando facilite cambiar implementaciones. Mantén interfaces pequeñas y cohesivas.'),
  'Excepciones': ('Java clasifica las excepciones por su jerarquía: las checked se deben capturar o declarar; las unchecked son RuntimeException y sus subclases, además de Error y sus subclases. La clasificación no depende de que el programador las considere un error de uso. try-with-resources cierra recursos AutoCloseable.', 'try (var lector = java.nio.file.Files.newBufferedReader(ruta)) {\n  System.out.println(lector.readLine());\n} catch (java.io.IOException e) {\n  System.err.println("No se pudo leer el fichero");\n}', 'No captures Exception para ocultar fallos ni ignores una excepción vacía. Añade contexto útil y conserva la causa al envolverla.'),
  'Colecciones': ('List mantiene orden y permite duplicados; Set modela elementos únicos; Map asocia claves y valores. La elección depende de las operaciones más frecuentes y de las garantías de orden necesarias.', 'List<String> nombres = new ArrayList<>();\nnombres.add("Lía");\nSet<String> unicos = new HashSet<>(nombres);\nMap<String, Integer> puntos = new HashMap<>();', 'Define tipos genéricos y no dependas del orden de HashMap/HashSet. Evita modificar una colección durante un for-each salvo mediante el mecanismo apropiado.'),
  'Genéricos y lambdas': ('Los genéricos aportan comprobación de tipos en compilación. Los comodines `? extends T` y `? super T` permiten expresar productores y consumidores. Las lambdas implementan interfaces funcionales.', 'List<String> nombres = List.of("ana", "Leo");\nnombres.stream()\n  .filter(n -> n.length() > 3)\n  .forEach(System.out::println);', 'No uses raw types si puedes parametrizar. Evita pipelines de streams difíciles de depurar y comprueba si una operación necesita ser perezosa o terminal.'),
  'Ficheros y pruebas': ('La API NIO.2 ofrece Path y Files para trabajar con rutas y ficheros. Una prueba automatizada debe comprobar un comportamiento observable y aislar casos normales, límites y errores esperados.', 'Path ruta = Path.of("datos.txt");\nFiles.writeString(ruta, "hola");\nString contenido = Files.readString(ruta);', 'Usa rutas temporales en pruebas y limpia los recursos. Una prueba debe fallar cuando la implementación incumple el requisito; evita comprobar detalles internos innecesarios.'),
 },
 'JavaScript': {
  'Sintaxis y consola': ('JavaScript es un lenguaje dinámico con ejecución en distintos entornos, como navegador y Node.js. La consola ayuda a inspeccionar valores, pero no sustituye pruebas repetibles. Los módulos permiten separar responsabilidades.', 'const saludo = (nombre) => `Hola, ${nombre}`;\nconsole.log(saludo("DAM"));', 'Usa const por defecto y let cuando reasignar sea necesario. Los puntos de ruptura y la inspección de valores suelen ser mejores que añadir logs indefinidamente.'),
  'Tipos y coerción': ('Los tipos primitivos incluyen string, number, bigint, boolean, undefined, symbol y null. Los objetos son valores de referencia. La coerción implícita puede producir resultados sorprendentes; `===` evita conversiones de tipo en la comparación.', 'console.log("5" + 1); // "51"\nconsole.log("5" === 5); // false\nconsole.log(Number("5") + 1); // 6', 'Comprueba Number.isNaN cuando corresponda y valida entradas externas. No asumas que una cadena vacía, cero, null y undefined significan lo mismo.'),
  'Operadores y condiciones': ('Las condiciones convierten sus expresiones a booleano cuando se evalúan como truthy/falsy. `&&`, `||` y `??` no son equivalentes: nullish coalescing solo usa el valor alternativo ante null o undefined.', 'const nombre = entrada ?? "Invitado";\nif (activo && permisos.includes("editar")) {\n  guardar();\n}', 'No uses `||` para valores por defecto si cero o cadena vacía son valores válidos. Haz explícitas las comparaciones cuando la intención no sea evidente.'),
  'Bucles e iteración': ('for, while y do-while controlan iteraciones. for...of recorre valores iterables; for...in enumera claves enumerables y no es la opción habitual para recorrer arrays. Métodos como map/filter expresan transformaciones.', 'const dobles = [1, 2, 3].map(n => n * 2);\nfor (const valor of dobles) console.log(valor);', 'No modifiques la colección de forma inesperada mientras la recorres. Comprueba terminación, orden y comportamiento con una colección vacía.'),
  'Funciones': ('Las funciones son valores de primera clase: pueden asignarse, pasarse como argumentos y devolverse. Las funciones flecha no crean su propio this. Los parámetros por defecto y la desestructuración pueden hacer las APIs más claras.', 'function calcularTotal(precio, unidades = 1) {\n  if (precio < 0 || unidades < 0) throw new Error("Valores inválidos");\n  return precio * unidades;\n}', 'Una función debe tener un contrato claro. Distingue retorno síncrono de Promise y evita mezclar efectos externos con cálculos puros si puedes separarlos.'),
  'Arrays y objetos': ('Los arrays ordenan elementos; map transforma, filter selecciona y reduce acumula. Los objetos representan propiedades. La desestructuración facilita extraer campos, mientras que spread crea copias superficiales, no profundas.', 'const persona = { nombre: "Ada", edad: 22 };\nconst { nombre, ...resto } = persona;\nconst actualizada = { ...persona, edad: 23 };', 'Evita mutaciones accidentales en estado compartido. Comprueba propiedades ausentes y recuerda que una copia superficial mantiene referencias a objetos anidados.'),
  'DOM y eventos': ('El DOM representa el documento como nodos. querySelector obtiene el primer elemento coincidente; addEventListener registra un manejador. Los datos introducidos por usuarios deben insertarse como texto, no como HTML sin sanear.', 'const boton = document.querySelector("#guardar");\nboton?.addEventListener("click", () => {\n  document.querySelector("#estado").textContent = "Guardado";\n});', 'Usa textContent para texto. Gestiona estados de carga/error, evita listeners duplicados y considera accesibilidad por teclado.'),
  'Módulos': ('Los módulos ES usan export e import. Separar módulos permite definir límites, reutilizar código y reducir variables globales. En navegador, el script se declara como type=module; Node interpreta módulos según configuración y extensión.', 'export function sumar(a, b) { return a + b; }\nimport { sumar } from "./matematica.js";\nconsole.log(sumar(2, 3));', 'Comprueba rutas y mayúsculas de archivo. Evita ciclos de dependencias complejos y exportaciones con nombres ambiguos.'),
  'Promesas y async/await': ('Una Promise representa el resultado eventual de una operación. async devuelve una Promise; await espera el resultado dentro de una función async o al nivel superior de un módulo. Si la promesa se rechaza, await propaga el rechazo como excepción.', 'async function cargar(url) {\n  const respuesta = await fetch(url);\n  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);\n  return respuesta.json();\n}', 'No olvides comprobar response.ok: fetch no rechaza la promesa solo por recibir HTTP 404/500. Usa AbortController para cancelaciones cuando proceda.'),
  'JSON y APIs': ('JSON es un formato textual de intercambio. JSON.parse convierte texto en valores JavaScript y puede lanzar SyntaxError; JSON.stringify serializa valores compatibles. Una API HTTP requiere tratar estados, formato y errores de red.', 'const texto = JSON.stringify({ tema: "DAM", nivel: 2 });\nconst datos = JSON.parse(texto);', 'Valida la estructura de la respuesta: que sea JSON válido no garantiza que tenga los campos esperados. No confíes en datos recibidos del servidor.'),
  'Clases y POO': ('class ofrece una sintaxis para construir objetos con métodos y estado. Los métodos de instancia viven en el prototipo; los métodos static pertenecen a la clase. La herencia debe reflejar una relación conceptual y no ser solo reutilización de código.', 'class Contador {\n  #valor = 0;\n  incrementar() { this.#valor++; }\n  get valor() { return this.#valor; }\n}', 'Los campos privados con # tienen restricciones reales de acceso. Comprueba el valor de this al pasar métodos como callbacks.'),
  'Errores y depuración': ('Error y sus subclases permiten representar fallos. try/catch trata excepciones síncronas y rechazos esperados si se coloca alrededor de await. Las herramientas del navegador permiten breakpoints, call stack e inspección de red.', 'try {\n  const resultado = await operacion();\n  mostrar(resultado);\n} catch (error) {\n  console.error("La operación ha fallado", error);\n}', 'No muestres detalles internos sensibles al usuario final. Registra contexto suficiente, pero evita tokens, contraseñas y datos personales.'),
  'Node.js y backend': ('Node.js ejecuta JavaScript fuera del navegador y ofrece módulos para sistema de archivos, procesos y red. Un servidor debe validar entradas, controlar errores y no confiar en que el cliente respete reglas de negocio.', 'import { createServer } from "node:http";\ncreateServer((req, res) => {\n  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });\n  res.end("Hola desde Node.js");\n}).listen(3000);', 'No concatentes datos de usuario en consultas SQL o comandos del sistema. Gestiona secretos mediante variables de entorno y limita tamaños/tiempos de solicitudes.'),
  'Pruebas y calidad': ('Las pruebas unitarias verifican unidades pequeñas; las de integración comprueban colaboración entre componentes. Una buena suite es determinista, rápida y expresa el contrato del sistema.', 'import test from "node:test";\nimport assert from "node:assert/strict";\ntest("sumar", () => assert.equal(2 + 3, 5));', 'Incluye casos normales, límites y errores. No dependas de la hora real, internet o estado compartido si puedes sustituirlos por dobles controlados.'),
  'Seguridad web': ('La seguridad depende de validar datos, controlar permisos y usar APIs seguras. XSS aparece cuando contenido no confiable se interpreta como código; CSRF afecta a ciertas solicitudes autenticadas; el almacenamiento de secretos en frontend no es seguro.', 'const salida = document.createElement("p");\nsalida.textContent = nombreIntroducido;\ncontenedor.append(salida);', 'Usa HTTPS, cookies con atributos apropiados, autorización en servidor, dependencias mantenidas y política CSP adecuada. La validación cliente mejora UX, pero nunca reemplaza al servidor.'),
 },
}

# Contenido de React, Python y Kotlin con conceptos fiables y ejemplos de referencia.
COMMON = {
 'Python': ('Python usa indentación significativa y tipado dinámico. Las anotaciones de tipos documentan contratos y ayudan a herramientas, pero no validan automáticamente los valores en tiempo de ejecución.', 'def saludar(nombre: str) -> str:\n    return f"Hola, {nombre}"\n\nprint(saludar("DAM"))', 'Usa entornos virtuales por proyecto y fija dependencias para reproducibilidad. Prueba entradas vacías, tipos inesperados y errores de E/S.'),
 'Kotlin': ('Kotlin distingue variables inmutables `val` y reasignables `var`. El sistema de tipos separa referencias anulables y no anulables; las funciones, clases y colecciones son parte central del lenguaje.', 'fun saludar(nombre: String): String {\n    return "Hola, $nombre"\n}\n\nprintln(saludar("DAM"))', 'Prefiere val cuando el valor no debe reasignarse. Modela la nulabilidad explícitamente y evita el operador `!!` salvo que exista una garantía real.'),
 'React': ('React construye interfaces mediante componentes que reciben props y pueden mantener estado. El render debe ser puro: describe la interfaz a partir de props y estado, sin mutaciones externas durante el render.', 'function Saludo({ nombre }) {\n  return <p>Hola, {nombre}</p>;\n}', 'No llames hooks condicionalmente. Usa keys estables en listas y efectos solo para sincronizar con sistemas externos, no para duplicar cálculos derivados.'),
}

# Mapeo de términos a ejemplos y explicaciones específicas adicionales.
DETAILS = {
 'Python': {
 'Instalación y primer programa': ('El intérprete ejecuta código fuente o bytecode gestionado por Python. `python -m venv .venv` crea un entorno virtual aislado para las dependencias del proyecto. `pip` instala paquetes en el entorno activo. Para activarlo en Windows, CMD usa `.venv\\Scripts\\activate.bat` y PowerShell usa `.\\.venv\\Scripts\\Activate.ps1`.', 'python --version\npython -m venv .venv\npython main.py'),
 'Variables y tipos': ('Los nombres enlazan objetos; no son cajas tipadas de forma estática. int, float, str y bool son tipos integrados comunes. Las cadenas son inmutables y las asignaciones enlazan nombres a objetos.', 'edad = 22\nprecio = 12.5\nactivo = True\nnombre = "Ada"\nprint(f"{nombre}: {edad}")'),
 'Operadores y condiciones': ('`and` y `or` cortocircuitan y devuelven uno de sus operandos; `is` compara identidad y `==` igualdad. Para pertenencia se utiliza `in` y para comprobar ausencia de valor se usa `is None`.', 'if edad >= 18 and activo:\n    print("Acceso permitido")\nelse:\n    print("Revisar acceso")'),
 'Bucles': ('for itera sobre elementos de un iterable; range produce una secuencia aritmética. while repite mientras la condición sea verdadera. break y continue alteran el flujo y deben facilitar, no dificultar, la lectura.', 'for numero in range(1, 4):\n    print(numero)\n\nwhile False:\n    print("No se ejecuta")'),
 'Listas y tuplas': ('Las listas son secuencias mutables; las tuplas son secuencias inmutables a nivel estructural. Los índices negativos cuentan desde el final y los slices usan un límite final excluido.', 'notas = [7, 8, 10]\nnotas.append(9)\nprimeras = notas[:2]\ncoordenadas = (36.7, -4.4)'),
 'Diccionarios y conjuntos': ('dict asocia claves hashables con valores; set almacena elementos únicos. Desde Python 3.7, dict garantiza el orden de inserción; en CPython 3.6 se conservaba como detalle de implementación. Ese orden no implica ordenación por clave.', 'alumno = {"nombre": "Ada", "nota": 9}\nalumno["nota"] = 10\ntecnologias = {"Python", "Java", "Python"}'),
 'Funciones': ('def crea una función; return devuelve un resultado y sin return explícito se devuelve None. Los valores por defecto se evalúan al definir la función, por lo que no conviene usar listas mutables como valor por defecto.', 'def añadir(item, destino=None):\n    if destino is None:\n        destino = []\n    destino.append(item)\n    return destino'),
 'Comprensiones y generadores': ('Las comprensiones construyen colecciones de forma concisa. Un generador produce valores bajo demanda y puede reducir memoria cuando se procesa una secuencia grande; se consume al iterarlo.', 'cuadrados = [n * n for n in range(5)]\npares = (n for n in range(1000) if n % 2 == 0)'),
 'Módulos y paquetes': ('Un módulo suele ser un archivo .py; un paquete agrupa módulos. `if __name__ == "__main__"` distingue ejecución directa de importación. Evita nombres de archivos que oculten módulos estándar.', 'from pathlib import Path\n\ndef main():\n    print(Path.cwd())\n\nif __name__ == "__main__":\n    main()'),
 'Excepciones': ('try/except captura excepciones concretas; else se ejecuta si no hubo excepción; finally se ejecuta al salir del bloque. Las excepciones deben comunicar fallos reales, no usarse como flujo normal de cada operación.', 'try:\n    numero = int(entrada)\nexcept ValueError:\n    print("Introduce un entero válido")'),
 'Ficheros y JSON': ('pathlib.Path ofrece operaciones de rutas; open con `with` cierra el archivo automáticamente. `json.load(fp)` deserializa desde un archivo; `json.loads(s)` lo hace desde texto o bytes. Ambas convierten JSON a objetos Python, cuya estructura debe validarse.', 'import json\nfrom pathlib import Path\ndatos = {"tema": "DAM", "nivel": 2}\ntexto = json.dumps(datos, ensure_ascii=False)\nPath("datos.json").write_text(texto, encoding="utf-8")\nrecuperado = json.loads(texto)'),
 'POO y dataclasses': ('Las clases agrupan estado y comportamiento. `dataclass` genera métodos comunes a partir de los campos declarados; no sustituye la validación de dominio ni hace inmutables los objetos salvo configuración específica.', 'from dataclasses import dataclass\n\n@dataclass\nclass Alumno:\n    nombre: str\n    nota: float'),
 'Librerías y entornos': ('Un entorno virtual separa las dependencias del proyecto del Python global. El archivo de dependencias debe documentar lo necesario para reconstruir el entorno; instalar paquetes requiere confiar en el origen.', 'python -m venv .venv\npython -m pip install paquete\npython -m pip freeze'),
 'Pruebas y depuración': ('unittest forma parte de la biblioteca estándar y organiza los casos en clases TestCase. pytest es un ejecutor externo que también admite funciones test_ y la sentencia assert. El ejemplo usa unittest.', 'import unittest\n\ndef sumar(a, b):\n    return a + b\n\nclass TestSuma(unittest.TestCase):\n    def test_sumar(self):\n        self.assertEqual(sumar(2, 3), 5)\n\nif __name__ == "__main__":\n    unittest.main()'),
 'APIs y seguridad': ('Las APIs HTTP intercambian solicitudes y respuestas. Deben tratar códigos de estado, tiempos de espera, validación de esquemas y secretos. Las respuestas remotas no son confiables por defecto.', 'import urllib.request\nwith urllib.request.urlopen("https://example.com", timeout=5) as respuesta:\n    print(respuesta.status)'),
 },
 'Kotlin': {
 'Primer programa Kotlin': ('El compilador Kotlin puede generar bytecode JVM y también tiene otros destinos. En JVM, el código puede ejecutarse desde una función main. La configuración del proyecto define versión del plugin y JDK objetivo.', 'fun main() {\n    println("Hola, DAM")\n}'),
 'val, var y tipos': ('`val` declara una variable o propiedad de solo lectura que no puede reasignarse; `var` sí permite reasignarla. Un `val` puede referirse a un objeto mutable: no se puede reasignar la variable, pero sí cambiar el estado del objeto. Kotlin infiere tipos cuando la expresión lo permite.', 'val nombre: String = "Ada"\nvar intentos = 0\nintentos += 1'),
 'Null safety': ('Los tipos `String` y `String?` son distintos. El acceso seguro `?.` evita dereferenciar null; `?:` proporciona alternativa; `!!` fuerza una aserción y puede lanzar NullPointerException.', 'val nombre: String? = obtenerNombre()\nval longitud = nombre?.length ?: 0'),
 'Condiciones y when': ('if puede ser una expresión que devuelve un valor. `when` permite comparar con valores, rangos, tipos o condiciones, y puede usarse como expresión exhaustiva.', 'val etiqueta = when (nota) {\n    in 9..10 -> "Sobresaliente"\n    in 7..8 -> "Notable"\n    else -> "Revisar"\n}'),
 'Bucles y rangos': ('Los rangos `..` incluyen el límite final; `until` lo excluye y `..<` expresa también un rango abierto. `downTo` recorre hacia atrás y `step` define el intervalo entre elementos. Comprueba límites al recorrer índices.', 'for (i in 0 until 3) {\n    println(i)\n}'),
 'Funciones': ('Las llamadas pueden nombrar argumentos y los parámetros pueden tener valores por defecto. Las funciones con cuerpo de expresión pueden inferir el tipo de retorno; las de cuerpo de bloque lo declaran explícitamente, salvo cuando devuelven `Unit`.', 'fun sumar(a: Int, b: Int = 0): Int = a + b'),
 'Colecciones': ('Kotlin distingue interfaces de colecciones de solo lectura de las mutables. Una colección de solo lectura no garantiza que el objeto subyacente sea inmutable si otra referencia puede modificarlo.', 'val numeros = listOf(1, 2, 3)\nval pares = numeros.filter { it % 2 == 0 }\nval mutable = mutableListOf("Java")'),
 'Clases y data class': ('Una data class genera equals, hashCode, toString y funciones componentN/copy basadas en propiedades del constructor primario. `copy()` es superficial: las referencias a objetos mutables se comparten. Es útil para datos, no implica persistencia ni validación automática.', 'data class Usuario(val id: Int, val nombre: String)\nval original = Usuario(1, "Ada")\nval copia = original.copy(nombre = "Lía")'),
 'Herencia e interfaces': ('Las clases y sus miembros son final por defecto; las interfaces y sus miembros son abiertos. `open` habilita herencia o sobrescritura en clases. `override` declara la implementación, y un miembro sobrescrito queda abierto por defecto, salvo que se marque `final`. Las interfaces pueden definir comportamiento, pero no guardar estado de instancia.', 'interface Exportable { fun exportar(): String }\nclass Informe : Exportable {\n    override fun exportar() = "informe"\n}'),
 'Lambdas y funciones de orden superior': ('Una función de orden superior recibe o devuelve funciones. `it` es el nombre implícito de un único parámetro de lambda. Las referencias a funciones pueden mejorar la claridad si la firma es evidente.', 'val nombres = listOf("Ada", "Lía")\nval largos = nombres.filter { it.length > 3 }'),
 'Excepciones': ('Kotlin no distingue excepciones checked y unchecked en el sistema de tipos. try puede ser una expresión. `use` cierra recursos Closeable/AutoCloseable al finalizar el bloque.', 'val numero = try { texto.toInt() } catch (e: NumberFormatException) { 0 }'),
 'Genéricos': ('Los parámetros de tipo permiten reutilizar código con seguridad estática. Kotlin admite declaración de varianza con `out` y `in`; la proyección de tipos limita qué operaciones se pueden realizar.', 'fun <T> primero(elementos: List<T>): T? = elementos.firstOrNull()'),
 'Coroutines': ('Una función suspend puede pausar y reanudarse mediante operaciones suspendibles como delay, sin bloquear el hilo mientras espera. La palabra clave no cambia por sí sola de hilo ni vuelve no bloqueante una llamada bloqueante; el dispatcher controla dónde se ejecuta la coroutine. delay, launch y async pertenecen a kotlinx.coroutines, que debe añadirse como dependencia. launch devuelve un Job; async, un Deferred con resultado; ambos se inician dentro de un CoroutineScope.', 'import kotlinx.coroutines.delay\nimport kotlinx.coroutines.runBlocking\nsuspend fun cargar() { delay(100L); println("listo") }\nfun main() = runBlocking { cargar() }'),
 'Ficheros y serialización': ('El acceso a archivos depende del target y de las bibliotecas. Este ejemplo usa `java.nio.file`, APIs de Kotlin/JVM; `Path.of` y `Files.writeString` requieren JDK 11 o posterior y no sirven en código común multiplataforma. Serializar transforma objetos a un formato intercambiable; el formato, versión y validación deben ser explícitos.', 'val ruta = java.nio.file.Path.of("datos.txt")\njava.nio.file.Files.writeString(ruta, "CódigoClaro")'),
 'Pruebas y arquitectura': ('Las pruebas de unidad aíslan reglas; las de integración verifican colaboración. Separar dominio, infraestructura y presentación reduce acoplamiento, pero conviene adaptar la arquitectura al tamaño real del proyecto.', 'import kotlin.test.Test\nimport kotlin.test.assertEquals\nclass SumaTest {\n    @Test fun suma() { assertEquals(5, 2 + 3) }\n}'),
 },
 'React': {
 'Componentes y JSX': ('JSX es una sintaxis que permite describir elementos UI desde JavaScript y se transforma mediante herramientas de compilación. Los componentes funcionales devuelven una descripción de la interfaz.', 'function App() {\n  return <main><h1>CódigoClaro</h1><p>Aprende haciendo.</p></main>;\n}'),
 'Props': ('Las props son entradas de un componente y deben tratarse como datos de solo lectura. Un componente padre puede pasar funciones como callbacks para comunicar acciones hacia arriba.', 'function Saludo({ nombre }) {\n  return <p>Hola, {nombre}</p>;\n}\n// <Saludo nombre="Ada" />'),
 'Estado con useState': ('useState añade estado local. La actualización programa un nuevo render; no modifica la variable capturada en el render actual. Si el siguiente valor depende del anterior, utiliza la forma funcional.', 'const [contador, setContador] = useState(0);\n<button onClick={() => setContador(c => c + 1)}>Sumar</button>'),
 'Eventos y formularios': ('Los handlers de eventos son funciones. Los inputs controlados reciben value y onChange desde estado; los no controlados pueden consultarse con referencias. La validación debe explicar qué campo necesita corrección.', 'const [nombre, setNombre] = useState("");\n<input value={nombre} onChange={e => setNombre(e.target.value)} />'),
 'Renderizado condicional': ('Las expresiones JavaScript permiten elegir qué mostrar. El operador && devuelve el operando de la izquierda si es falsy, por lo que `0 && ...` puede renderizar un cero visible.', '{cargando ? <p>Cargando…</p> : error ? <p role="alert">Error</p> : <Contenido />}'),
 'Listas y keys': ('map suele transformar una colección en elementos React. Las keys identifican elementos entre renders y deben ser estables y únicas entre hermanos; usar el índice puede ser incorrecto si la lista cambia de orden.', '{alumnos.map(alumno => <li key={alumno.id}>{alumno.nombre}</li>)}'),
 'useEffect': ('useEffect sincroniza un componente con sistemas externos como suscripciones, temporizadores o APIs. No es necesario para calcular valores derivados del estado. La función de limpieza deshace suscripciones o recursos; todos los valores reactivos usados por el efecto deben estar en sus dependencias.', 'useEffect(() => {\n  const id = setInterval(() => {\n    setSegundos(actuales => actuales + 1);\n  }, 1000);\n  return () => clearInterval(id);\n}, []);'),
 'Hooks personalizados': ('Un hook personalizado encapsula lógica reutilizable de estado o efectos. Su nombre comienza por use y debe respetar las reglas de hooks; no comparte automáticamente el mismo estado entre componentes.', 'function useContadorInicial(valor = 0) {\n  const [n, setN] = useState(valor);\n  return [n, () => setN(x => x + 1)];\n}'),
 'Context': ('Context permite compartir un valor con componentes descendientes sin prop drilling en cada nivel. No es una base de datos global universal; dividir contextos y memoizar valores puede evitar renders innecesarios.', 'const TemaContext = createContext("claro");\n// El proveedor coloca el valor disponible para descendientes.'),
 'React Router': ('Una biblioteca de enrutado permite relacionar rutas con componentes y parámetros. Los detalles de API dependen de la versión instalada; consulta la documentación de la versión del proyecto.', '<Routes>\n  <Route path="/" element={<Inicio />} />\n  <Route path="/temas/:id" element={<Tema />} />\n</Routes>'),
 'Peticiones a APIs': ('Una petición debe modelar estados de carga, éxito y error. Si se obtienen datos manualmente con useEffect, hay que cancelar o ignorar respuestas obsoletas y comprobar códigos HTTP y forma de los datos. En proyectos con framework, prioriza su mecanismo integrado de datos o una caché: Effects manuales no resuelven por sí solos caché ni renderizado en servidor.', 'useEffect(() => {\n  const c = new AbortController();\n  fetch(url, { signal: c.signal })\n    .then(r => { if (!r.ok) throw Error("HTTP " + r.status); return r.json(); })\n    .then(setDato)\n    .catch(e => { if (e.name !== "AbortError") setError(e); });\n  return () => c.abort();\n}, [url]);'),
 'Validación de formularios': ('La validación de interfaz ayuda al usuario a corregir entradas, pero el servidor debe validar de nuevo. Los errores deben asociarse a campos, anunciarse de forma accesible y no borrar datos válidos innecesariamente.', '<label htmlFor="email">Correo</label>\n<input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />'),
 'Rendimiento': ('Primero mide el problema. React.memo, useMemo y useCallback pueden reducir trabajo en casos concretos, pero añaden complejidad y no hacen falta en todo componente. Si React Compiler está configurado, puede memoizar componentes y valores automáticamente. Las keys estables ayudan a reconciliar listas.', 'const total = useMemo(() => calcularTotal(items), [items]);'),
 'Pruebas de componentes': ('Una prueba de componente debe comprobar el comportamiento observable desde la perspectiva del usuario. Las pruebas robustas consultan roles, etiquetas y texto accesible en vez de depender de detalles internos.', 'render(<Boton onClick={guardar}>Guardar</Boton>);\nawait user.click(screen.getByRole("button", { name: "Guardar" }));\nexpect(guardar).toHaveBeenCalled();'),
 'Seguridad y despliegue': ('El cliente no puede guardar secretos de servidor. Evita renderizar HTML no confiable, valida en servidor y revisa configuración de variables de entorno. El despliegue debe producir artefactos reproducibles y servir por HTTPS.', 'const textoSeguro = String(mensajeUsuario);\nreturn <p>{textoSeguro}</p>;'),
 }
}

# Enriquecimiento temático: cada apartado incluye preguntas y ejercicios relacionados con el título real.
def topic_specific(track, title, desc):
    """Añade contenido adaptado a un tema concreto del catálogo didáctico."""
    detail = DETAILS.get(track, {}).get(title)
    if detail:
        return detail[0], detail[1]
    base = COMMON.get(track)
    if base:
        return base[0] + ' En este capítulo se aplica esa base a «' + title + '»: ' + desc, base[1]
    return 'Este tema estudia «' + title + '». ' + desc + ' Relaciona cada decisión con el contrato del lenguaje, el resultado observable y los límites del problema. La sintaxis exacta debe contrastarse con la documentación oficial de la versión utilizada.', '/* Ejemplo esquemático: adapta nombres y tipos al caso real */\n// 1. Define la entrada\n// 2. Aplica una regla\n// 3. Comprueba el resultado'

# Fuentes de tipografía que cubren caracteres españoles y símbolos comunes.
font_regular = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font_bold = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
if Path(font_regular).exists():
    pdfmetrics.registerFont(TTFont('DejaVu', font_regular)); pdfmetrics.registerFont(TTFont('DejaVu-Bold', font_bold))
    FONT, BOLD = 'DejaVu', 'DejaVu-Bold'
else:
    FONT, BOLD = 'Helvetica', 'Helvetica-Bold'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitleCC', fontName=BOLD, fontSize=24, leading=30, textColor=colors.HexColor('#243b80'), spaceAfter=16, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='SubCC', fontName=FONT, fontSize=11, leading=14, textColor=colors.HexColor('#475467'), spaceAfter=5))
styles.add(ParagraphStyle(name='H1CC', fontName=BOLD, fontSize=16, leading=19, textColor=colors.HexColor('#243b80'), spaceBefore=4, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name='H2CC', fontName=BOLD, fontSize=10.5, leading=13, textColor=colors.HexColor('#087f8c'), spaceBefore=6, spaceAfter=3, keepWithNext=True))
styles.add(ParagraphStyle(name='BodyCC', fontName=FONT, fontSize=9, leading=12.2, textColor=colors.HexColor('#263244'), spaceAfter=5))
styles.add(ParagraphStyle(name='SmallCC', fontName=FONT, fontSize=8, leading=10, textColor=colors.HexColor('#596579'), spaceAfter=3))
styles.add(ParagraphStyle(name='CodeCC', fontName='Courier', fontSize=8, leading=10, leftIndent=8, rightIndent=8, backColor=colors.HexColor('#f3f5f9'), borderColor=colors.HexColor('#d8deea'), borderWidth=.5, borderPadding=6, spaceBefore=3, spaceAfter=5))
styles.add(ParagraphStyle(name='BulletCC', parent=styles['BodyCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=2))
styles.add(ParagraphStyle(name='BodyLastCC', fontName=FONT, fontSize=9.5, leading=13.6, textColor=colors.HexColor('#263244'), spaceAfter=6))
styles.add(ParagraphStyle(name='BulletLastCC', parent=styles['BodyLastCC'], leftIndent=13, firstLineIndent=-8, bulletIndent=0, spaceAfter=3))


def esc(s):
    """Escapa texto para insertarlo de forma segura en el marcado de un PDF."""
    return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def para(s, style='BodyCC'):
    """Crea un párrafo PDF con el estilo editorial solicitado."""
    return Paragraph(esc(s).replace('\n','<br/>'), styles[style])
def bullet(s):
    """Crea un elemento de lista para los documentos generados."""
    return Paragraph('• ' + esc(s), styles['BulletCC'])

def footer(canvas, doc):
    """Dibuja el pie de página y la numeración de cada página del PDF."""
    canvas.saveState(); w,h=A4
    canvas.setStrokeColor(colors.HexColor('#d9dee8')); canvas.line(1.8*cm,1.35*cm,w-1.8*cm,1.35*cm)
    canvas.setFont(FONT,7); canvas.setFillColor(colors.HexColor('#667085'))
    canvas.drawString(1.8*cm,0.95*cm,'CódigoClaro · Síntesis basada en fuentes oficiales')
    canvas.drawRightString(w-1.8*cm,0.95*cm,f'Página {doc.page}')
    canvas.restoreState()

def make_pages(item):
    """Construye una guía breve, respaldada por fuentes y compuesta en flujo continuo."""
    track, num, title, desc = item['track'], item['num'], item['title'], item['description']
    concept, code = topic_specific(track, title, desc)
    warning = 'Comprueba el contrato del ejemplo con datos normales, límites y errores; consulta la documentación enlazada para confirmar la versión que usas.'
    if track in ('Java', 'JavaScript') and title in TOPIC.get(track, {}):
        concept, code, warning = TOPIC[track][title]
    elif track in DETAILS.get(track, {}):
        concept, code = DETAILS[track][title]

    owner = SOURCE_OWNERS[track]
    specific_refs = {
        ('Java', 'Constructores y this'): [('Oracle Java SE 25: Flexible Constructor Bodies', 'https://docs.oracle.com/en/java/javase/25/language/flexible-constructor-bodies.html')],
        ('Java', 'Excepciones'): [('Java Language Specification SE 25, capítulo 11', 'https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html')],
        ('JavaScript', 'Promesas y async/await'): [('MDN: await', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await')],
        ('JavaScript', 'JSON y APIs'): [('MDN: Using the Fetch API', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch')],
        ('Python', 'Pruebas y depuración'): [('Python 3: unittest', 'https://docs.python.org/3/library/unittest.html'), ('pytest: documentation', 'https://docs.pytest.org/en/stable/')] ,
        ('Kotlin', 'Coroutines'): [('Kotlin: Coroutines basics', 'https://kotlinlang.org/docs/coroutines-basics.html')],
        ('React', 'useEffect'): [('React: useEffect', 'https://react.dev/reference/react/useEffect')],
        ('React', 'Peticiones a APIs'): [('React: useEffect', 'https://react.dev/reference/react/useEffect'), ('MDN: Using the Fetch API', 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch')],
        ('React', 'React Router'): [('React Router: Routing', 'https://reactrouter.com/start/declarative/routing')],
        ('React', 'Rendimiento'): [('React: React Compiler', 'https://react.dev/learn/react-compiler/introduction'), ('React: useMemo', 'https://react.dev/reference/react/useMemo')],
        ('React', 'Pruebas de componentes'): [('React Testing Library: introducción', 'https://testing-library.com/docs/react-testing-library/intro/')],
        ('Java', 'Ficheros y pruebas'): [('Java NIO: Files API', 'https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Files.html'), ('JUnit 5 User Guide', 'https://junit.org/junit5/docs/current/user-guide/')],
        ('JavaScript', 'DOM y eventos'): [('MDN: Document Object Model', 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction'), ('MDN: EventTarget.addEventListener', 'https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener')],
        ('JavaScript', 'Node.js y backend'): [('Node.js: API documentation', 'https://nodejs.org/docs/latest/api/')],
    }
    refs = list(specific_refs.get((track, title), REFS[track]))
    seen = set()
    refs = [(label, url) for label, url in refs if not (url in seen or seen.add(url))]
    source_links = [
        Paragraph(
            f'<link href="{esc(url)}" color="#087f8c">{esc(label)}</link>',
            styles['SmallCC']
        )
        for label, url in refs
    ]

    page_one = [
        para(f'CÓDIGOCLARO · RUTA {track.upper()}', 'H2CC'),
        para(f'Tema {num:02d} · {title}', 'CoverTitleCC'),
        para('Síntesis de estudio · Fuentes primarias enlazadas · DAM/DAW', 'SubCC'),
        para('1. Objetivo', 'H1CC'),
        para(desc),
        para('Objetivos de aprendizaje', 'H2CC'),
        *[bullet(x) for x in [
            f'Explicar el propósito de {title.lower()} con un ejemplo propio.',
            'Reconocer las condiciones que exige la solución y qué resultado debe producir.',
            'Contrastar las decisiones de sintaxis con la documentación primaria enlazada.',
            'Probar un caso normal y un caso límite antes de dar el ejercicio por terminado.',
        ]],
        para('Cómo estudiar este tema', 'H2CC'),
        para('Lee primero la explicación y separa los hechos del lenguaje de las decisiones del ejemplo. Predice el resultado antes de ejecutar el código. Después cambia un solo dato, anota qué esperas que ocurra y comprueba si la evidencia confirma tu razonamiento.'),
        para('2. Base conceptual', 'H1CC'),
        para(concept),
        para('Modelo mental', 'H2CC'),
        para(f'Para razonar sobre {title.lower()}, sigue la relación entre el dato de entrada, la regla que describe la documentación, el estado que puede cambiar y el resultado observable. Explica qué parte del comportamiento garantiza el lenguaje y qué parte depende de las decisiones del programa.'),
        para('Vocabulario de trabajo', 'H2CC'),
        *[bullet(x) for x in [
            'Contrato: entradas admitidas y resultado que debe garantizarse.',
            'Estado: información que conserva el programa entre operaciones.',
            'Caso límite: una frontera que puede cambiar el resultado esperado.',
            'Regresión: un comportamiento correcto que deja de funcionar después de un cambio.',
        ]],
        para('Qué debes reconocer', 'H2CC'),
        *[bullet(x) for x in [
            f'Identifica qué parte de {title.lower()} resuelve el problema descrito en el objetivo.',
            'Distingue la regla del lenguaje de las APIs que aporta el entorno de ejecución.',
            'Antes de ejecutar el ejemplo, predice su resultado y explica qué dato lo determina.',
        ]],
        para('Preguntas antes de ejecutar', 'H2CC'),
        *[bullet(x) for x in [
            f'¿Qué línea representa directamente {title.lower()}?',
            '¿Qué valor o condición determina el resultado?',
            '¿Qué ocurriría con una entrada vacía, repetida o fuera del rango esperado?',
        ]],
        para('3. Ejemplo de referencia', 'H1CC'),
        Preformatted(code, styles['CodeCC']),
        para('Lectura del ejemplo', 'H2CC'),
        *[bullet(x) for x in [
            'Localiza la declaración o punto de entrada y nombra los datos que recibe.',
            'Señala la operación que aplica la idea central del tema.',
            'Anota el resultado esperado; después, ejecútalo y contrasta la predicción.',
            'Cambia una sola entrada y explica qué comportamiento debe variar.',
        ]],
    ]

    page_two = [
        para('4. Decisiones de diseño', 'H1CC'),
        para(f'Elige {title.lower()} cuando el contrato del problema coincida con su propósito. Escribe primero qué entra, qué resultado esperas y qué restricciones deben seguir siendo ciertas. La descripción de este tema sirve como alcance; no presupongas capacidades que no aparezcan en la fuente de la versión utilizada.'),
        para('Descomposición del problema', 'H2CC'),
        *[bullet(x) for x in [
            'Entrada: identifica quién proporciona el dato y qué formato debe tener.',
            'Precondición: escribe qué debe ser cierto antes de aplicar la regla.',
            'Proceso: separa cada transformación y evita ocultar decisiones distintas.',
            'Salida: define el valor, cambio de estado o respuesta que se puede observar.',
            'Fallo: decide qué hacer si la entrada es inválida o una dependencia no responde.',
            'Coste: comprueba si el tamaño de los datos puede afectar tiempo o memoria.',
        ]],
        para('Comprobaciones que importan', 'H2CC'),
        *[bullet(x) for x in [
            'Caso normal: usa una entrada válida y registra el resultado observable.',
            'Límite: prueba el valor mínimo, máximo, vacío o repetido que tenga sentido para este tema.',
            'Error: decide cómo se comunica un dato inválido o un fallo externo.',
            'Compatibilidad: registra versión del lenguaje, runtime y biblioteca utilizada.',
            'Mantenimiento: conserva una prueba reproducible para el comportamiento que acabas de estudiar.',
        ]],
        para('5. Precisión y límites', 'H1CC'),
        para(warning),
        para('Depuración y diagnóstico', 'H2CC'),
        *[bullet(x) for x in [
            'Reproduce el fallo con la entrada más pequeña que todavía lo provoca.',
            'Lee el mensaje de error y localiza la primera línea relevante de la traza.',
            'Inspecciona los valores justo antes de la operación que no se comporta como esperabas.',
            'Formula una hipótesis y cambia una sola cosa en cada intento.',
            'Convierte el caso que fallaba en una prueba de regresión.',
            'Vuelve a ejecutar el caso normal y el límite para comprobar que no has roto otro comportamiento.',
        ]],
        para('6. Práctica guiada', 'H1CC'),
        para(f'Construye una solución pequeña para practicar {title.lower()} en una aplicación de aula. Usa la descripción «{desc}» como requisito funcional y escribe antes una entrada y una salida esperadas.'),
        *[bullet(x) for x in [
            'Implementa primero el caso normal con el ejemplo de la página anterior.',
            'Añade un caso límite y un caso que deba rechazarse o tratarse de otra forma.',
            'Separa los datos de prueba de la operación para poder repetir el ejercicio.',
            'Anota qué afirmación técnica has contrastado en la documentación oficial.',
        ]],
        para('7. Verificación', 'H2CC'),
        Table(
            [
                [para('Prueba', 'SmallCC'), para('Qué debe quedar claro', 'SmallCC')],
                [para('Normal', 'SmallCC'), para('La regla principal produce el resultado previsto.', 'SmallCC')],
                [para('Límite', 'SmallCC'), para('El comportamiento en la frontera está definido.', 'SmallCC')],
                [para('Error', 'SmallCC'), para('El fallo no se oculta ni daña el estado.', 'SmallCC')],
            ],
            colWidths=[3.2*cm, 12.2*cm],
            style=TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eaf0ff')),
                ('GRID', (0,0), (-1,-1), .4, colors.HexColor('#d9dee8')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ])
        ),
    ]

    page_three = [
        para('8. Laboratorio', 'H1CC'),
        para(f'Resuelve estas tareas sin copiar el ejemplo. En cada respuesta, explica qué aporta {title.lower()} y qué evidencia usarías para comprobar la solución.'),
        para('Nivel inicial', 'H2CC'),
        para(f'Reproduce el ejemplo con nombres y datos nuevos. Mantén el objetivo «{desc}» y escribe el resultado que esperas antes de ejecutarlo.'),
        para('Nivel intermedio', 'H2CC'),
        para('Amplía el caso con una segunda condición de negocio. Añade pruebas para el caso normal, un límite y un error; revisa que cada prueba comprueba un resultado observable.'),
        para('Nivel de aplicación', 'H2CC'),
        para(f'Integra {title.lower()} en una pequeña función, componente o consulta del proyecto. Justifica una decisión de diseño con la referencia oficial del tema.'),
        para('Revisión por otra persona', 'H2CC'),
        para('Entrega el ejercicio sin explicar de antemano cómo funciona. Pide a otra persona que identifique la entrada, prediga el resultado y proponga un caso límite. Si necesita una explicación oral para entender el código, mejora los nombres o la estructura.'),
        para('9. Solución orientativa y autoevaluación', 'H1CC'),
        para('Una respuesta sólida explica la regla aplicada, los datos de entrada, el resultado esperado y la condición que podría romper el caso. Debe distinguir la sintaxis documentada de las decisiones propias del ejercicio y citar la fuente que confirma el comportamiento.'),
        para('Criterios de revisión', 'H2CC'),
        Table(
            [
                [para('Criterio', 'SmallCC'), para('En proceso', 'SmallCC'), para('Consolidado', 'SmallCC')],
                [para('Corrección', 'SmallCC'), para('Solo resuelve el caso básico.', 'SmallCC'), para('Incluye límites y errores relevantes.', 'SmallCC')],
                [para('Claridad', 'SmallCC'), para('La intención no está clara.', 'SmallCC'), para('Nombres y estructura muestran el propósito.', 'SmallCC')],
                [para('Evidencia', 'SmallCC'), para('No hay resultado reproducible.', 'SmallCC'), para('La prueba y la fuente justifican la respuesta.', 'SmallCC')],
            ],
            colWidths=[3.0*cm, 5.7*cm, 6.7*cm],
            style=TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#eaf0ff')),
                ('GRID', (0,0), (-1,-1), .4, colors.HexColor('#d9dee8')),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('LEFTPADDING', (0,0), (-1,-1), 5),
                ('RIGHTPADDING', (0,0), (-1,-1), 5),
                ('TOPPADDING', (0,0), (-1,-1), 5),
                ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ])
        ),
        *[bullet(x) for x in [
            f'¿Puedes explicar {title.lower()} sin repetir el ejemplo?',
            '¿Qué caso límite probaste y por qué era relevante?',
            '¿Qué parte depende de la versión o de una biblioteca externa?',
            '¿Qué referencia oficial consultarías ante un resultado distinto?',
        ]],
        para('Glosario de repaso', 'H2CC'),
        para(f'{title}: tema y decisión técnica que se estudian en esta guía. Contrato: entradas admitidas y resultado prometido. Caso límite: frontera que puede cambiar la salida. Fuente primaria: documentación publicada o mantenida por el proyecto responsable del lenguaje o herramienta.'),
        para('Entrega final', 'H2CC'),
        para('Incluye un ejemplo mínimo, los datos de entrada, el resultado esperado y una prueba que se pueda volver a ejecutar. Anota la versión del lenguaje y pega la referencia exacta que confirma la regla aplicada. Si el resultado no coincide con tu predicción, registra el caso antes de cambiar el código.'),
        para('10. Fuentes y atribución', 'H1CC'),
        para(f'Esta guía es una síntesis didáctica en español basada en documentación mantenida por {owner}. No reproduce capítulos completos ni sustituye la referencia oficial; comprueba en los enlaces la versión de tu proyecto. Consulta:'),
        *source_links,
    ]
    for index, flowable in enumerate(page_three):
        if isinstance(flowable, Paragraph) and flowable.style.name == 'BodyCC':
            page_three[index] = Paragraph(flowable.text, styles['BodyLastCC'])
        elif isinstance(flowable, Paragraph) and flowable.style.name == 'BulletCC':
            page_three[index] = Paragraph(flowable.text, styles['BulletLastCC'])
    return [page_one, page_two, page_three]

def build_pdf(item):
    """Genera el PDF de un tema en la carpeta pública organizada de temarios."""
    dest = PUB / 'temarios' / item['file']
    story=[]
    pages = make_pages(item)
    for content in pages:
        # Deja fluir las secciones para no reservar una página casi vacía por apartado.
        story.extend(content)
    doc=SimpleDocTemplate(str(dest), pagesize=A4, rightMargin=1.8*cm, leftMargin=1.8*cm, topMargin=1.65*cm, bottomMargin=1.8*cm, title=f"{item['track']} · Tema {item['num']:02d}: {item['title']}", author='CódigoClaro · síntesis con fuentes oficiales', subject=f"Temario didáctico de {item['track']} para DAM y DAW")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return dest, doc.page


# Ruta adicional mantenida separada del catálogo principal para no regenerar
# los 75 temarios ni sobrescribir su índice al producir estos materiales.
TS_ROUTE_SOURCES = {
    'intro': ('Handbook: introducción', 'https://www.typescriptlang.org/docs/handbook/intro.html'),
    'everyday': ('Handbook: tipos cotidianos', 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html'),
    'objects': ('Handbook: tipos de objeto', 'https://www.typescriptlang.org/docs/handbook/2/objects.html'),
    'exact_optional': ('TSConfig: exactOptionalPropertyTypes', 'https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html'),
    'strict': ('TSConfig: strict', 'https://www.typescriptlang.org/tsconfig/strict.html'),
    'strict_null_checks': ('TSConfig: strictNullChecks', 'https://www.typescriptlang.org/tsconfig/strictNullChecks.html'),
    'narrowing': ('Handbook: narrowing', 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html'),
    'functions': ('Handbook: funciones', 'https://www.typescriptlang.org/docs/handbook/2/functions.html'),
    'generics': ('Handbook: genéricos', 'https://www.typescriptlang.org/docs/handbook/2/generics.html'),
    'types_from_types': ('Handbook: creación de tipos a partir de tipos', 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html'),
    'utility': ('Handbook: tipos de utilidad', 'https://www.typescriptlang.org/docs/handbook/utility-types.html'),
    'classes': ('Handbook: clases', 'https://www.typescriptlang.org/docs/handbook/2/classes.html'),
    'modules': ('Handbook: módulos', 'https://www.typescriptlang.org/docs/handbook/2/modules.html'),
    'tsconfig': ('Referencia oficial de TSConfig', 'https://www.typescriptlang.org/tsconfig/'),
    'migration': ('Handbook: migrar desde JavaScript', 'https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html'),
    'jsdoc': ('Handbook: tipos JSDoc', 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html'),
    'declarations': ('Handbook: archivos de declaración', 'https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html'),
    'allow_js': ('TSConfig: allowJs', 'https://www.typescriptlang.org/tsconfig/allowJs.html'),
    'check_js': ('TSConfig: checkJs', 'https://www.typescriptlang.org/tsconfig/checkJs.html'),
    'react': ('React: usar TypeScript', 'https://react.dev/learn/typescript'),
    'node_typescript': ('Node.js: TypeScript en ejecución', 'https://nodejs.org/api/typescript.html'),
}

TS_ROUTE = [
    {
        'title': 'Del JavaScript al verificador de TypeScript',
        'concept': 'TypeScript analiza estáticamente programas JavaScript y permite describir sus valores con tipos. El análisis ayuda a detectar incompatibilidades antes de ejecutar; no inspecciona ni valida por sí solo los datos que llegan en tiempo de ejecución.',
        'objective': 'Distinguir verificación estática, ejecución JavaScript y opciones del proyecto; reconocer qué cambia al activar strict.',
        'practice': 'Toma una función JavaScript que calcule el total de una compra. Añade tipos gradualmente, configura un tsconfig mínimo con strict y registra qué defectos detecta el compilador y cuáles requieren comprobaciones en ejecución.',
        'criterion': 'Explica un hallazgo estático y un riesgo que sigue en tiempo de ejecución.',
        'sources': ['intro', 'tsconfig', 'strict'],
    },
    {
        'title': 'Inferencia, anotaciones y tipos básicos',
        'concept': 'El compilador puede inferir un tipo a partir del valor inicial y del contexto. Las anotaciones son útiles cuando aclaran una frontera o un contrato; no hace falta repetir automáticamente información que ya está bien inferida.',
        'objective': 'Leer tipos inferidos y usar string, number, boolean y tipos literales donde aclaren el contrato.',
        'practice': 'Convierte una función de descuento de JS: acepta un precio y un código promocional limitado a "ESTUDIANTE" o "GENERAL". Anota solo las fronteras necesarias y compara los errores con la versión sin tipos.',
        'criterion': 'Predice qué llamadas son aceptadas sin recurrir a any.',
        'sources': ['everyday'],
    },
    {
        'title': 'Arrays, tuplas y colecciones de solo lectura',
        'concept': 'Los arrays representan secuencias de elementos de un tipo; las tuplas expresan una secuencia con posiciones y tipos conocidos. Las variantes readonly limitan las operaciones de escritura disponibles desde esa referencia.',
        'objective': 'Elegir entre array y tupla según si importa el tamaño o el significado de cada posición.',
        'practice': 'Modela productos de inventario como pares [codigo, unidades], con codigo string y unidades number. Escribe una función que sume las unidades por código y explica por qué su entrada es una colección y cada fila una tupla.',
        'criterion': 'Detecta una fila incompleta y evita mutar la entrada si el contrato la declara readonly.',
        'sources': ['everyday', 'objects'],
    },
    {
        'title': 'Tipos de objeto y propiedades opcionales',
        'concept': 'Un tipo de objeto describe las propiedades que una operación puede leer. `?` permite omitir una propiedad y al leerla se debe contemplar `undefined`; `exactOptionalPropertyTypes` cambia si también se permite asignar `undefined` explícitamente. `readonly` restringe la asignación a través de esa referencia, pero no convierte todo el objeto en inmutable.',
        'objective': 'Describir registros con propiedades requeridas, opcionales y de solo lectura.',
        'practice': 'Define `Modulo` con identificador readonly, nombre, curso opcional y plazas. Presenta el curso ausente como "sin asignar"; compara la asignación explícita de `undefined` con `exactOptionalPropertyTypes` activado y desactivado, y revisa un objeto literal con una propiedad mal escrita.',
        'criterion': 'Al leer `curso`, contempla `undefined` y explica qué cambia al asignarlo explícitamente.',
        'sources': ['objects', 'exact_optional'],
    },
    {
        'title': 'Uniones y narrowing del flujo de control',
        'concept': 'Una unión expresa varios estados posibles. Comprobaciones como typeof, in y una propiedad discriminante permiten al compilador estrechar esa unión dentro de una rama; la lógica de ejecución sigue siendo necesaria.',
        'objective': 'Representar alternativas sin campos contradictorios y estrecharlas antes de usar propiedades específicas.',
        'practice': 'Modela el resultado de buscar un módulo con los estados encontrado, no encontrado y error. Usa `kind` y, en `default`, asigna el valor restante a una variable de tipo `never`; añade un estado y comprueba que el compilador señala esa asignación hasta que incluyas su rama.',
        'criterion': 'Cada rama accede solo a los datos presentes en ese estado.',
        'sources': ['narrowing', 'everyday'],
    },
    {
        'title': 'Funciones, callbacks y contratos',
        'concept': 'Los tipos de función describen parámetros y resultado. Los callbacks pueden recibir sus propios contratos; parámetros opcionales y rest deben reflejar las llamadas que el código realmente permite.',
        'objective': 'Tipar entradas, salidas y callbacks sin usar Function ni debilitar el contrato con any.',
        'practice': 'Escribe `filtrarModulos` con una lista y un predicado `(modulo: Modulo) => boolean`; úsalo para filtrar por curso. Después define `buscarModulos(lista, curso?: string)` para que, si se omite el curso, devuelva todos los módulos. Comprueba también el resultado con una lista vacía.',
        'criterion': '`filtrarModulos` entrega un módulo al predicado y recibe un booleano; `buscarModulos` acepta que se omita el curso.',
        'sources': ['functions'],
    },
    {
        'title': 'type, interface y composición de contratos',
        'concept': 'Los alias dan nombre a tipos y pueden representar uniones, primitivas u objetos. Las interfaces describen formas de objeto y pueden extender otras interfaces. La compatibilidad de objetos de TypeScript se basa normalmente en la forma requerida.',
        'objective': 'Escoger una forma legible de compartir y ampliar contratos de datos.',
        'practice': 'Define `Persona` y `Docente`; expresa que un docente conserva nombre e identificador y añade departamento. Crea una función que reciba `Persona` y analiza por qué también acepta un docente.',
        'criterion': 'Justifica la composición por los campos requeridos, no por el nombre del tipo.',
        'sources': ['objects'],
    },
    {
        'title': 'null, unknown y límites de confianza',
        'concept': 'Con strictNullChecks, null y undefined deben tratarse explícitamente. unknown admite un valor no conocido, pero exige estrecharlo antes de operar. Un tipo estático no demuestra que una respuesta JSON cumpla el esquema esperado.',
        'objective': 'Modelar ausencia y estrechar valores externos antes de tratarlos como datos de dominio.',
        'practice': 'Escribe `leerModulo(valor: unknown)` que acepte solo un objeto con `id` string y `nombre` string. Comprueba null, una cadena, un objeto incompleto y uno válido; devuelve un resultado explícito para cada caso.',
        'criterion': 'La función valida en ejecución y no convierte datos con una aserción ciega.',
        'sources': ['everyday', 'narrowing', 'strict_null_checks'],
    },
    {
        'title': 'Genéricos y restricciones',
        'concept': 'Un parámetro genérico conserva la relación entre tipos de entrada y salida. Una restricción expresa qué propiedades necesita una operación sin eliminar el tipo concreto del valor recibido.',
        'objective': 'Crear funciones reutilizables que preserven el tipo de su entrada y limiten solo lo necesario.',
        'practice': 'Implementa `buscarPorId<T extends { id: string }>` para una colección de módulos o profesores. Devuelve el elemento con su tipo original y representa explícitamente el caso sin coincidencia.',
        'criterion': 'El resultado mantiene campos propios de T sin añadir aserciones.',
        'sources': ['generics'],
    },
    {
        'title': 'Tipos derivados y operadores de tipos',
        'concept': '`keyof` obtiene claves de un tipo y el acceso indexado consulta el tipo asociado a una clave. Los tipos de utilidad Pick y Partial expresan transformaciones comunes sobre esos contratos.',
        'objective': 'Derivar una forma de actualización sin duplicar el tipo completo del dominio.',
        'practice': 'Construye `CambiosDeModulo` a partir de `Modulo`: solo se pueden cambiar nombre y plazas, ambos opcionales. Usa el tipo en una función de actualización y provoca un error intentando editar el id.',
        'criterion': 'El tipo derivado acepta cambios permitidos y rechaza `id` en un objeto literal comprobado.',
        'sources': ['types_from_types', 'utility'],
    },
    {
        'title': 'Clases y compatibilidad estructural',
        'concept': 'Las clases añaden constructores, campos y métodos; no son la única forma de describir objetos. El sistema de tipos estructural permite que valores distintos sean compatibles cuando ofrecen los miembros requeridos.',
        'objective': 'Separar un contrato de servicio de una implementación concreta y evitar jerarquías sin una relación de sustitución clara.',
        'practice': 'Declara un contrato `RepositorioModulo` y crea una clase que lo implemente. Pasa también un objeto literal con los mismos métodos; compara qué garantiza el contrato y qué comportamiento debe comprobarse aparte.',
        'criterion': 'El consumidor depende del contrato y no de campos internos de la clase.',
        'sources': ['classes', 'objects'],
    },
    {
        'title': 'Módulos TypeScript en un proyecto Node',
        'concept': 'import y export describen dependencias entre módulos. En TypeScript, module define el formato que se interpreta y emite, mientras moduleResolution guía cómo se resuelven importaciones durante el análisis. El cargador de Node ejecuta y resuelve con sus propias reglas. La ejecución nativa de .ts depende de la versión y la sintaxis; el soporte integrado de Node no admite .tsx, y su type stripping no comprueba tipos ni aplica tsconfig al runtime.',
        'objective': 'Comparar la resolución de TypeScript con el formato de módulo, las extensiones y el comportamiento del Node objetivo.',
        'practice': 'Separa un modelo de módulo, una función de búsqueda y el punto de entrada en archivos distintos. Sigue cada importación y compara la resolución de tsc con la de Node. Si ejecutas archivos .ts directamente, verifica qué sintaxis admite esa versión y separa esa ejecución de la comprobación de tipos con tsc.',
        'criterion': 'Distingue una comprobación del compilador de la resolución real del cargador.',
        'sources': ['modules', 'tsconfig', 'node_typescript'],
    },
    {
        'title': 'Migración gradual de JavaScript y declaraciones',
        'concept': 'La migración puede admitir archivos JS junto a TS mediante allowJs; JSDoc aporta información de tipos a archivos JavaScript. Los archivos .d.ts describen una API existente y no implementan su comportamiento.',
        'objective': 'Planificar una conversión por módulos y decidir cuándo basta JSDoc o hace falta una declaración.',
        'practice': 'Elige un helper JS sin dependencias externas. Activa `allowJs` y `checkJs`, incluye el archivo en tsconfig y añade JSDoc para sus parámetros y retorno; después conviértelo a TS conservando las llamadas. Redacta una declaración mínima para una dependencia sin tipos.',
        'criterion': 'La migración mantiene la API y separa descripción de implementación.',
        'sources': ['migration', 'jsdoc', 'declarations', 'allow_js', 'check_js'],
    },
    {
        'title': 'React con TSX: props, children y eventos',
        'concept': 'Los archivos que contienen JSX usan .tsx y necesitan opciones JSX válidas. TypeScript puede inferir el tipo del evento por el contexto del handler JSX; los tipos de React ofrecen ChangeEvent y ReactNode para children.',
        'objective': 'Definir props explícitas y tratar el evento adecuado sin anotar cada expresión por costumbre.',
        'practice': 'Crea `FiltroModulo.tsx` con props para texto, valor y callback. Compara el evento inferido en un handler inline con un handler extraído tipado como `React.ChangeEvent<HTMLInputElement>`; ofrece `children` opcionales como `React.ReactNode` y consulta la guía para `@types/react`, `@types/react-dom` y una opción `jsx` válida en tsconfig.',
        'criterion': 'Una llamada JSX inválida se detecta y el callback expone el valor correcto.',
        'sources': ['react'],
    },
    {
        'title': 'React con estado tipado y estados de petición',
        'concept': 'useState suele inferir su tipo inicial. Una unión discriminada puede representar estados mutuamente excluyentes de una petición; useReducer acepta un estado y acciones que pueden describirse con tipos.',
        'objective': 'Evitar combinaciones de estado imposibles y estrechar el estado antes de mostrar datos o errores.',
        'practice': 'Construye una pantalla de módulos con idle, loading, success y error. Tipifica estado y acciones, implementa un reducer con switch y renderiza los datos solo en success; añade una acción para volver a intentar.',
        'criterion': 'Cada transición conserva los campos que corresponden a su estado.',
        'sources': ['react', 'narrowing'],
    },
]


def typescript_route_footer(canvas, doc):
    """Dibuja un pie propio de la ruta sin modificar el generador principal."""
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(colors.HexColor('#d9dee8'))
    canvas.line(1.8 * cm, 1.35 * cm, width - 1.8 * cm, 1.35 * cm)
    canvas.setFont(FONT, 7)
    canvas.setFillColor(colors.HexColor('#667085'))
    canvas.drawString(1.8 * cm, .95 * cm, 'CódigoClaro · Ruta complementaria de TypeScript · Fuentes oficiales')
    canvas.drawRightString(width - 1.8 * cm, .95 * cm, f'Página {doc.page}')
    canvas.restoreState()


def build_typescript_route():
    """Genera solo la ruta TypeScript y sus dos copias documentales."""
    filename = 'Ruta_TypeScript_JavaScript_React_Node_15_Temas.pdf'
    output_paths = [ROOT / 'docs' / 'temarios' / filename, PUB / 'temarios' / filename]
    for output_path in output_paths:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        story = [
            para('CÓDIGOCLARO · RUTA COMPLEMENTARIA', 'H2CC'),
            para('TypeScript: de JavaScript a React y Node', 'CoverTitleCC'),
            para('15 temas · Para quienes ya conocen JavaScript · Revisión documental: 27 de octubre de 2026', 'SubCC'),
            para('Propósito de la ruta', 'H1CC'),
            para('El recorrido parte de funciones y objetos JavaScript y añade, paso a paso, el sistema de tipos de TypeScript. Termina usando los contratos en módulos orientados a Node y en componentes React con TSX. La documentación oficial enlazada guía cada tema; los ejemplos y prácticas de este material están redactados para este curso.', 'BodyCC'),
            para('Cómo trabajar', 'H2CC'),
            para('En cada tema, predice primero qué acepta el verificador. Después resuelve la práctica y compara el resultado con el criterio de dominio. Las comprobaciones estáticas describen el programa; valida en ejecución las entradas externas y consulta la configuración del proyecto antes de aplicar opciones a Node o React.', 'BodyCC'),
            Spacer(1, 5),
        ]

        for index, topic in enumerate(TS_ROUTE, start=1):
            source_links = []
            for source_key in topic['sources']:
                label, url = TS_ROUTE_SOURCES[source_key]
                source_links.append(f'<link href="{url}" color="#087f8c">{esc(label)}</link>')
            topic_block = [
                para(f"Tema {index:02d} · {topic['title']}", 'H2CC'),
                para(topic['concept']),
                Paragraph(f"<b>Objetivo:</b> {esc(topic['objective'])}", styles['BodyCC']),
                Paragraph(f"<b>Práctica:</b> {esc(topic['practice'])}", styles['BodyCC']),
                Paragraph(f"<b>Criterio de dominio:</b> {esc(topic['criterion'])}", styles['SmallCC']),
                Paragraph('<b>Documentación:</b> ' + ' · '.join(source_links), styles['SmallCC']),
                Spacer(1, 4),
            ]
            story.append(KeepTogether(topic_block))
            if index in (4, 8, 12):
                story.append(PageBreak())

        story.append(KeepTogether([
            para('Laboratorio integrador · catálogo de módulos', 'H2CC'),
            para('Organiza una solución en tres piezas: un módulo compartido con el tipo `Modulo` y funciones puras; una entrada Node que importe esas funciones; y un componente React que reciba resultados mediante props y represente estados de petición con una unión discriminada. Antes de aceptar JSON como `Modulo`, valida sus campos en tiempo de ejecución. Entrega los tres módulos, un caso normal, uno vacío y uno inválido, y explica qué garantiza el verificador y qué comprobación protege la frontera de datos.'),
            Paragraph('<b>Documentación:</b> <link href="https://www.typescriptlang.org/docs/handbook/2/modules.html" color="#087f8c">Handbook: módulos</link> · <link href="https://react.dev/learn/typescript" color="#087f8c">React: usar TypeScript</link> · <link href="https://www.typescriptlang.org/docs/handbook/2/narrowing.html" color="#087f8c">Handbook: narrowing</link>', styles['SmallCC']),
        ]))

        doc = SimpleDocTemplate(
            str(output_path), pagesize=A4,
            rightMargin=1.8 * cm, leftMargin=1.8 * cm,
            topMargin=1.35 * cm, bottomMargin=1.8 * cm,
            title='TypeScript: de JavaScript a React y Node · 15 temas',
            author='CódigoClaro',
            subject='Ruta complementaria de aprendizaje de TypeScript',
        )
        doc.build(story, onFirstPage=typescript_route_footer, onLaterPages=typescript_route_footer)
    # Ambas ubicaciones se publican como una misma versión del documento.
    shutil.copyfile(output_paths[0], output_paths[1])
    print(f'Generadas {len(TS_ROUTE)} unidades en {len(output_paths)} copias de la ruta TypeScript.')

AUTO_DESCRIPTION_SUFFIX = 'Temario ampliado con 10 secciones: fundamentos, ejemplos, depuración, pruebas y prácticas.'


def clean_auto_description(description):
    """Quita únicamente las copias finales del sufijo añadido por el generador."""
    cleaned = str(description).rstrip()
    while cleaned.endswith(AUTO_DESCRIPTION_SUFFIX):
        cleaned = cleaned[:-len(AUTO_DESCRIPTION_SUFFIX)].rstrip()
    return cleaned


def main():
    """Regenera los 75 temas del catálogo y sincroniza sus copias documentales."""
    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    docs_catalog_path = ROOT / 'docs' / 'catalogo_temas.json'
    docs_catalog = json.loads(docs_catalog_path.read_text(encoding='utf-8'))

    catalog_files = [item['file'] for item in catalog]
    docs_catalog_files = [item['file'] for item in docs_catalog]
    if catalog_files != docs_catalog_files:
        raise ValueError('Los catálogos docs/public no contienen los mismos archivos y en el mismo orden.')

    page_counts = {}
    for item in catalog:
        filename = item['file']
        relative_path = Path(filename)
        if relative_path.name != filename or relative_path.suffix.lower() != '.pdf':
            raise ValueError(f'Nombre de PDF inesperado en el catálogo: {filename!r}')

        # Limpia el sufijo heredado antes de componer prácticas con description.
        item['description'] = clean_auto_description(item['description'])
        root_pdf, page_count = build_pdf(item)
        for mirror_pdf in (ROOT / 'docs' / 'temarios' / filename,):
            mirror_pdf.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root_pdf, mirror_pdf)
        item['pages'] = page_count
        page_counts[filename] = page_count
        item['version'] = '2.0'

    for item in docs_catalog:
        item['description'] = clean_auto_description(item['description'])
        item['pages'] = page_counts[item['file']]

    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    docs_catalog_path.write_text(json.dumps(docs_catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Generados {len(catalog)} temarios compactados ({min(page_counts.values())}-{max(page_counts.values())} páginas por documento) y dos copias organizadas por tema.')
if __name__ == '__main__':
    if sys.argv[1:] == ['--typescript-route']:
        build_typescript_route()
    else:
        main()
