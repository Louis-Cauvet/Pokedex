"use strict";

let compteurAjoutPokemon = 0;

// on définit le numéro du premier pokemon s'affichant, puis on ouvre l'accès à la base de données
let pokemonActuel = 1;
ouvrirBdd();

// on fait en sorte que l'image du sprite change quand on appuie sur le bouton "boutonChroma"
let boutonChangementSprite = document.getElementById("boutonChroma");
let spriteNormal = document.getElementById("spriteNormalPokemon");
let spriteShiny = document.getElementById("spriteShinyPokemon");
// si on clique sur le bouton
boutonChangementSprite.addEventListener("click", ()=>{
    if(getComputedStyle(spriteNormal).display == "block"){
        spriteNormal.style.display = "none";
        spriteShiny.style.display = "block";
        boutonChangementSprite.textContent = "Forme normale";
    } else {
        spriteNormal.style.display = "block";
        spriteShiny.style.display = "none";
        boutonChangementSprite.textContent = "Forme shiny";
    }
});

let boutonListe = document.getElementById("boutonListe");
let zoneListePokemons = document.getElementById("zoneListePokemons");
// si le bouton est cliqué, la liste apparaît 
boutonListe.addEventListener("click", () => {
    if(zoneListePokemons.style.visibility == "hidden"){
        zoneListePokemons.style.visibility = "visible";
    } else {
        zoneListePokemons.style.visibility = "hidden";
    }
});

window.addEventListener('resize', () => {
    if(window.innerWidth > 768){
        zoneListePokemons.style.visibility = "visible";
    }
});


// on gère le cas où l'utilisateur ajoute un filtre avec les listes déroulantes
let filtreType = document.getElementById("filtreType");
let filtreGeneration = document.getElementById("filtreGeneration");
let listePokemons = document.getElementById("listePokemons");
// si l'utilisateur change la valeur du filtre de type
filtreType.addEventListener("change", ()=>{
    // on vide la liste des pokemons qu'elle contenait
    listePokemons.innerHTML = "";
    if(filtreType.value!="" || filtreGeneration.value!=""){
        // on appelle la fonction permettant d'afficher la liste des pokemons correspondants aux critères choisis
        afficherListeFiltres(filtreType.value, filtreGeneration.value);
    }
});
// si l'utilisateur change la valeur du filtre de génération
filtreGeneration.addEventListener("change", ()=>{
    // on vide la liste des pokemons qu'elle contenait
    listePokemons.innerHTML = "";
    if(filtreType.value!="" ||filtreGeneration.value!=""){
        // on appelle la fonction permettant d'afficher la liste des pokemons correspondants aux critères choisis
        afficherListeFiltres(filtreType.value, filtreGeneration.value);
    }
});


function ouvrirBdd(){
    // on ouvre la base dbPokedex pour y stocker et récupérer les données de tous les pokemons
    let requeteDb = indexedDB.open("dbPokedex",2);
    // indexedDB.deleteDatabase("dbPokedex");

    // gestionnaire intervenant si la base de données doit être mise à jour 
    requeteDb.onupgradeneeded = function(){
        let dbPokedex = requeteDb.result;
		
        // on crée le store "Pokemons" uniquement s'il n'existe pas déjà
        if(!dbPokedex.objectStoreNames.contains("Pokemons")){
            dbPokedex.createObjectStore("Pokemons", {keyPath:"pokeId"});
            console.log("Le stockage 'Pokemons' a bien été crée !");
        }
		
		  window.alert("Bonjour, le chargement des données sur le stockage local de la page (indexedDb) va débuter, cela peut prendre environ 10 secondes...");

        // on va parcourir la liste des pokemons existants dans les API (1010 au total)
        for (let i=1; i<1011; i++){
            // on appelle la fonction qui va rentre chaque pokemon dans le store un par un (selon son index "i")
            chargerPokedex(dbPokedex, i);
        }
    };

    // gestionnaire intervenant si la base de données n'a pas pu être ouverte 
    requeteDb.onerror = function(){
        alert("impossible d'accéder à la base de données !");
    };

    // gestionnaire intervenant si la base de données a bien été ouverte 
    requeteDb.onsuccess = function(){
        let dbPokedex = requeteDb.result;

        // si la version de base de données à été mise à jour pendant que la fenêtre était ouverte
        dbPokedex.onversionchange = function(){
            dbPokedex.close();
            window.alert("La base de données recherchée est dépassée, merci de réactualiser la page svp !");
        };

        // on récupère les données du pokemon selon son identifiant
        recupererPokemon(dbPokedex,pokemonActuel);
    };
}

const chargerPokedex = async(db,index) =>{
    // on effectue une requête sur une API pour récupérer les sprites
    let requeteApiSprites = 'https://pokeapi.co/api/v2/pokemon/'+index;
    let listeDonneesSprites = await fetch(requeteApiSprites);
    let reponseSprites = await listeDonneesSprites.json();
    
    // on effectue une requête sur une autre API pour récupérer les autres données
    let requeteApiAutres = 'https://api-pokemon-fr.vercel.app/api/v1/pokemon/'+index;
    let listeDonneesAutres = await fetch(requeteApiAutres);
    let reponseAutres = await listeDonneesAutres.json();

    // on gère le cas où le pokemon n'a qu'un seul type
    let deuxiemeType = "";
    if(reponseAutres.types.length > 1){
        deuxiemeType = reponseAutres.types[1].name;
    }
    // on gère le cas où le pokemon n'a pas ou qu'une seule capacité spéciale
    let premiereCapaSpe = "";
    let deuxiemeCapaSpe = "";
    if(reponseAutres.talents == null){
        premiereCapaSpe = "Inconnue";
    } else if(reponseAutres.talents.length >= 2){
        premiereCapaSpe = reponseAutres.talents[0].name;
        deuxiemeCapaSpe = reponseAutres.talents[1].name;
    } else {
        premiereCapaSpe = reponseAutres.talents[0].name;
    }

    // on crée un élément avec les données du pokemon qu'on va ajouter dans le store
    let nvPoke = [{
        pokeId: index,
        sprite_normal: reponseSprites.sprites.front_default,
        sprite_shiny: reponseSprites.sprites.front_shiny,
        nom: reponseAutres.name.fr,
        type1: reponseAutres.types[0].name,
        type2: deuxiemeType,
        capaSpe1: premiereCapaSpe,
        capaSpe2: deuxiemeCapaSpe,
        taille: reponseAutres.height,
        poids: reponseAutres.weight,
        generation: reponseAutres.generation 
    }];

    // on ouvre le store "Pokemons"
    let transaction = db.transaction(["Pokemons"],"readwrite");
    let pokemons = transaction.objectStore("Pokemons");

    // on ajoute les données du pokemon dans le store ouvert
    let ajoutNvPoke = pokemons.add(nvPoke[0]);

    // si l'ajout du pokemon s'est bien déroulé
    ajoutNvPoke.onsuccess = function(){ 
        console.log("Pokemon ajouté avec la clef " + ajoutNvPoke.result);
        compteurAjoutPokemon = compteurAjoutPokemon+1;
        if(compteurAjoutPokemon == 1010){
            window.alert("Toutes les données ont bien été ajoutées au stockage local de la page, merci pour votre patience !");
            // on récupère les données du pokemon selon son identifiant
            recupererPokemon(db,pokemonActuel);
        }
    };
    // s'il y a eu un problème durant l'ajout du pokemon
    ajoutNvPoke.onerror = function(){
        console.log("Erreur, le pokemon n'a pas pu être ajouté : " + ajoutNvPoke.error);
    };
}  
    
function recupererPokemon(db,index){
    // on récupère le store "Pokemons" en mode lecture pour accéder aux données qu'il contient
    let transaction = db.transaction(["Pokemons"],"readonly");
    let pokemons = transaction.objectStore("Pokemons");
    
    // on effectue une requête en passant l'index du pokemon comme une clé permettant de le récupérer
    let requete = pokemons.get(index);
    
    // si la requête obtient un résultat sans souci
    requete.onsuccess = function(){
        afficherPokemon(requete);
    }
    // si la requête n'arrive pas à s'exécuter correctement
    requete.onerror = function(){
        console.log("Impossible d'accéder aux données du pokemon à afficher...");
    }
}

function afficherPokemon(requete){
    // on identifie les différents champs qui seront modifiés avec les données récupérées
    let pokeNum = document.getElementById("numPokemon");
    let pokeSpriteNormal = document.getElementById("spriteNormalPokemon");
    let pokeSpriteShiny = document.getElementById("spriteShinyPokemon");
    let pokeNom = document.getElementById("nomPokemon");
    let pokeType1 = document.getElementById("type1");
    let pokeType2 = document.getElementById("type2");
    let pokeTalent1 = document.getElementById("talentPokemon1");
    let pokeTalent2 = document.getElementById("talentPokemon2");
    let pokeTaille = document.getElementById("taillePokemon");
    let pokePoids = document.getElementById("poidsPokemon");

    // on insère les différentes données du pokemon dans leurs zones attitrées
    pokeNum.textContent = "#"+requete.result.pokeId;         
    pokeNom.textContent = requete.result.nom;
    pokeSpriteNormal.src = requete.result.sprite_normal;
    // on fait disparaître le bouton "boutonChroma" si le sprite shiny n'existe pas pour le pokemon concerné
    if(requete.result.sprite_shiny == null){
        boutonChangementSprite.style.display = "none";
        pokeSpriteNormal.style.display = "block";
        pokeSpriteShiny.style.display = "none";
        boutonChangementSprite.textContent = "Forme shiny";
    } else {
        boutonChangementSprite.style.display = "flex";
        pokeSpriteShiny.src = requete.result.sprite_shiny; 
    }

    pokeType1.textContent = requete.result.type1;
    pokeType2.textContent = requete.result.type2;
    // on adapte la couleur de la zone au type affiché
    changerCouleurType(pokeType1.textContent, pokeType1);
    changerCouleurType(pokeType2.textContent, pokeType2);

    pokeTalent1.textContent = requete.result.capaSpe1;
    pokeTalent2.textContent = requete.result.capaSpe2;
    pokeTaille.textContent = requete.result.taille;
    pokePoids.textContent = requete.result.poids;

    // on change l'indentifiant du pokemon actuel
    pokemonActuel = requete.result.pokeId;
}

function changerCouleurType(typePoke, zoneChange){
    // selon le type passé en paramètres, on change la couleur de la zone d'affichage
    switch (typePoke){
        case 'Normal':
            zoneChange.style.backgroundColor = '#9A966A';
            break;
        case 'Combat':
            zoneChange.style.backgroundColor = '#6A1410';
            break;
        case 'Vol':
            zoneChange.style.backgroundColor = '#967EE0';
            break;
        case 'Poison':
            zoneChange.style.backgroundColor = '#8B2F88';
            break;
        case 'Sol':
            zoneChange.style.backgroundColor = '#CBA854';
            break;
        case 'Roche':
            zoneChange.style.backgroundColor = '#AB8E2A';
            break;
        case 'Insecte':
            zoneChange.style.backgroundColor = '#96A81E';
            break; 
        case 'Spectre':
            zoneChange.style.backgroundColor = '#5D4882';
            break;
        case 'Acier':
            zoneChange.style.backgroundColor = '#ABA8C8';
            break;
        case 'Feu':
            zoneChange.style.backgroundColor = '#FF6833';
            break;
        case 'Eau':
            zoneChange.style.backgroundColor = '#5581EB';
            break;
        case 'Plante':
            zoneChange.style.backgroundColor = '#66C03D';
            break;
        case 'Électrik':
            zoneChange.style.backgroundColor = '#F3C41E';
            break;
        case 'Psy':
            zoneChange.style.backgroundColor = '#FF3D73';
            break;
        case 'Glace':
            zoneChange.style.backgroundColor = '#86CFCD';
            break;
        case 'Dragon':
            zoneChange.style.backgroundColor = '#5B28F6';
            break;
        case 'Ténèbres':
            zoneChange.style.backgroundColor = '#634838';
            break;
        case 'Fée':
            zoneChange.style.backgroundColor = '#D792DA';
            break;
        case "":
            zoneChange.style.backgroundColor = '#FFFFFF';
            break;
    }
}

// Fonction permettant d'afficher le pokemon dont le numéro est le précédent de celui affiché
function pokePrecedent(){
    pokemonActuel = pokemonActuel-1;
    if(pokemonActuel==0){
        pokemonActuel = 1010;
    }
    ouvrirBdd();
}

// Fonction permettant d'afficher le pokemon dont le numéro est le suivant de celui affiché
function pokeSuivant(){
    pokemonActuel = pokemonActuel+1;
    if(pokemonActuel==1011){
        pokemonActuel = 1;
    }
    ouvrirBdd();
}

// Fonction permettant d'afficher le pokemon dont le numero est saisi dans le champ de recherche
function effectuerRecherche(){
    let idRecherche = document.getElementById("saisieRecherche").value;
    if(idRecherche<1 || idRecherche>1010){
        alert("Ce nombre n'existe pas dans le pokedex !");
        document.getElementById("saisieRecherche").value= "";
    } else {
        let idString = parseInt(idRecherche);
        pokemonActuel = idString;
        ouvrirBdd();
        document.getElementById("saisieRecherche").value= "";
    }
}

// Fonction permettant d'afficher la liste de tous les pokemons répondants aux critères choisis dans le filtre
function afficherListeFiltres(typeChoisi, genChoisie){
    let requeteDb = indexedDB.open("dbPokedex",2);

    // gestionnaire intervenant si la base de données n'a pas pu être ouverte 
    requeteDb.onerror = function(){
        alert("impossible d'accéder à la base de données !");
    };

    // gestionnaire intervenant si la base de données a bien été ouverte 
    requeteDb.onsuccess = function(){
        let dbPokedex = requeteDb.result;

        dbPokedex.onversionchange = function(){
            dbPokedex.close();
            window.alert("La base de données recherchée est dépassée, merci de réactualiser la page svp !");
        };

        let transaction = dbPokedex.transaction(["Pokemons"],"readonly");
        let pokemons = transaction.objectStore("Pokemons");

        for (let i=1; i<1011; i++){
            let requete = pokemons.get(i);

            // si la requête obtient un résultat sans souci
            requete.onsuccess = function(){
                // dans le cas où il n'y a que le filtre de génération
                if(typeChoisi==""){
                    if(requete.result.generation == genChoisie){
                        afficherElementListe(requete);
                    }
                // dans le cas où il n'y a que le filtre de type
                } else if(genChoisie==""){
                    if(requete.result.type1 == typeChoisi || requete.result.type2 == typeChoisi){
                        afficherElementListe(requete);
                    }
                // dans le cas où les 2 filtres sont activés
                } else {
                    if(requete.result.generation == genChoisie && requete.result.type1 == typeChoisi){
                        afficherElementListe(requete);
                    } else if(requete.result.generation == genChoisie && requete.result.type2 == typeChoisi){
                        afficherElementListe(requete);
                    }
                }
            }
            // si la requête n'arrive pas à s'exécuter correctement
            requete.onerror = function(){
                console.log("Impossible d'accéder aux données du pokemon à afficher...");
            }
        }
        
        
    };
}

function afficherElementListe(requete){
    // création de la balise <div> qui correspond à un nouveau pokemon dans la liste
    const nvPokemon = document.createElement('div');      
    nvPokemon.className = "elementListe";   
    let listePokedex = document.getElementById("listePokemons"); 
    listePokedex.append(nvPokemon); 

    // on ajoute un événement à chaque élément de la liste afin d'afficher le pokemon qu'il représente si on clique dessus
    nvPokemon.addEventListener("click", () => {
        pokemonActuel = requete.result.pokeId;
        if(getComputedStyle(boutonListe).display != "none"){
            zoneListePokemons.style.visibility = "hidden";
        }
        ouvrirBdd();
    });  

    // création de l'image à insérer dans le nouveau pokemon de la liste
    const spriteNvPokemon = document.createElement('img');
    spriteNvPokemon.className = "spriteElementListe"; 
    spriteNvPokemon.src = requete.result.sprite_normal;
    nvPokemon.append(spriteNvPokemon); 

    // création du nom asssocié au numéro du nouveau pokemon de la liste
    const nomNvPokemon = document.createElement('div');
    nomNvPokemon.className = "nomElementListe"; 
    nomNvPokemon.textContent = "#"+requete.result.pokeId+" "+requete.result.nom;
    nvPokemon.append(nomNvPokemon);  
}
