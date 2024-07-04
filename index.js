const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const fileupload = require('express-fileupload')
const fs = require('fs');
const app = express();

const port = 5000;

const Posts = require('./posts.js');

const session = require('express-session');

mongoose.connect('mongodb+srv://robertinfinity10:lvXpPG63ByTYKPAA@portal-noticiais.gg73jeq.mongodb.net/portal-noticiais?retryWrites=true&w=majority&appName=portal-noticiais', { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Conectado com Sucesso!')
}).catch(() => console.log('Erro...'))

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: 'keyboard cut',
    cookie: { maxAge: 60000 }
}));
// secret - É 

app.use(fileupload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'temp')
}))

app.get('/', (req, res) => {
    if (req.query.busca == null) {
        Posts.find({}).sort({ '_id': -1 }).exec(function (err, posts) {
            // Comando para pegar tudo do mais recente primeiro.
            posts = posts.map((val) => {
                return {
                    titulo: val.titulo,
                    categoria: val.categoria,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0, 100),
                    img: val.img,
                    slug: val.slug,
                }
            })


            Posts.find({}).sort({ 'views': -1 }).limit(3).exec(function (err, postsTop) {
                postsTop = postsTop.map(function (val) {
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(0, 100),
                        img: val.img,
                        slug: val.slug,
                        categoria: val.categoria,
                        views: val.views
                    }
                })
                res.render('home', { posts: posts, postsTop: postsTop });
            })
        })



    } else {
        Posts.find({ titulo: { $regex: req.query.busca, $options: "i" } }, (error, posts) => {
            console.log(posts)
            res.render('busca', {
                posts: posts, contagem: posts.length, descricaoCurta: posts
            });
        })
    }
});

app.get('/:slug', (req, res) => {
    Posts.findOneAndUpdate(
        { slug: req.params.slug },
        { $inc: { views: 1 } },
        { new: true },
        (err, resposta) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erro ao buscar e atualizar notícia.');
            }
            if (!resposta) {
                return res.status(404).send('Notícia não encontrada.');

            }
            Posts.find({}).sort({ 'views': -1 }).limit(3).exec(function (err, postsTop) {
                postsTop = postsTop.map(function (val) {
                    return {
                        titulo: val.titulo,
                        conteudo: val.conteudo,
                        descricaoCurta: val.conteudo.substr(0, 100),
                        img: val.img,
                        slug: val.slug,
                        categoria: val.categoria,
                        views: val.views
                    }
                })
                res.render('single', { noticia: resposta, postsTop: postsTop });
            })
        }
    );
});

var usuarios = [
    {
        login: 'robert',
        senha: '123'
    }
];

app.post('/admin/login', (req, res) => {
    usuarios.map((val) => {
        if (val.login == req.body.login && val.senha == req.body.senha) {
            req.session.login = "teste"
        }
    })
    res.redirect('/admin/login');
})

// Painel ADMIN
app.get('/admin/login', (req, res) => {
    if (req.session.login == null) {
        res.render('admin-login', {})
    } else {
        Posts.find({}).sort({ 'views': -1 }).exec(function (err, posts) {
            posts = posts.map(function (val) {
                return {
                    id: val._id,
                    titulo: val.titulo,
                    conteudo: val.conteudo,
                    descricaoCurta: val.conteudo.substr(0, 100),
                    img: val.img,
                    slug: val.slug,
                    categoria: val.categoria,
                    views: val.views
                }
            })
            res.render('admin-painel', { posts: posts });
        })
    }
})

app.post('/admin/cadastro', (req, res) => {
    try {
        let imagem = "";

        if (req.body.url_imagem && req.files && req.files.arquivo) {
            return res.status(400).send("Não é permitido enviar a URL da imagem e fazer upload de arquivo simultaneamente.");
        } else if (req.body.url_imagem) {
            imagem = req.body.url_imagem;
        } else if (req.files && req.files.arquivo) {
            let formato = req.files.arquivo.name.split('.');
            if (formato[formato.length - 1].toLowerCase() == "jpg") {
                imagem = new Date().getTime() + '.jpg';
                req.files.arquivo.mv(__dirname + '/public/images/' + imagem, (err) => {
                    if (err) {
                        console.error("Erro ao mover o arquivo:", err);
                        return res.status(500).send("Erro ao salvar a imagem.");
                    }
                });
                imagem = 'http://localhost:5000/public/images/' + imagem;
            } else {
                fs.unlinkSync(req.files.arquivo.tempFilePath);
                return res.status(400).send("Formato de arquivo não suportado. Apenas arquivos .jpg são permitidos.");
            }
        } else {
            return res.status(400).send("É necessário enviar uma URL de imagem ou fazer upload de um arquivo.");
        }

        console.log(req.files);

        Posts.create({
            titulo: req.body.titulo_noticia,
            categoria: req.body.categoria,
            conteudo: req.body.conteudo,
            img: imagem,
            slug: req.body.slug,
            autor: req.body.autor,
            views: 0
        }, (err, post) => {
            if (err) {
                console.error("Erro ao criar post:", err);
                return res.status(500).send("Erro ao cadastrar a notícia.");
            }
            res.send("Cadastrado com Sucesso!");
        });
    } catch (err) {
        console.error("Erro no cadastro:", err);
        res.status(500).send("Erro no servidor.");
    }
});


app.get('/admin/deletar/:id', (req, res) => {
    Posts.deleteOne({ _id: req.params.id }).then(() => {
        res.send('Deletado a Notícia com Sucesso!');
    })
})

app.listen(port, () => {
    console.log("Rodando na porta", port);
});
