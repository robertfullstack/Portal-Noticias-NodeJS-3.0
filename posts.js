var mongoose = require("mongoose");
var Schema = mongoose.Schema;
// Schema - Usado para manipular dados de uma coleção.

var postSchema = new Schema({
    titulo: String,
    categoria: String,
    conteudo: String,
    img: String,
    slug: String,
    autor: String,
    views: Number
}, { collection: 'posts' })


var Posts = mongoose.model("posts", postSchema);

module.exports = Posts;