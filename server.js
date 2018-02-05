'use strict'

var Pusher = require('pusher-js');
var Tele = require('tgfancy');
var fs = require('fs');
var numeral = require('numeral');
var schedule = require('node-schedule');

const persen_naik = 15;
const persen_turun = -15;

let status_up_down = false;

let koneksi = false;
const bot = new Tele('key',{
    tgfancy: {
        feature: true,
    }
});


const soket = new Pusher('a0dfa181b1248b929b11', {
    cluster: 'ap1',
    encrypted: true
});

koneksi = soket.subscribe('tradedata-btcidr');
koneksi.bind('update', function(data) {
    CekPerubahanPersentase(data.prices,data.prices_24h,data.volumes);
});

CekPerubahanPersentase = (harga,harga24,volume) => {
    let obj = {
        harga_terakhir: []
     };

    let pesan = '';
    Object.keys(harga).forEach(function(key){
        let persen = (((harga[key]-harga24[key]) / harga24[key] * 1000) / 10);
        let jml_persen = parseFloat(persen).toFixed(1);
        let tipe = key.substr(key.length - 3);
        let coin = key.substr(0,3).toUpperCase();
        let price = RubahNilai(tipe, harga[key]);
        
        obj.harga_terakhir.push({
            key:key,
            jml_persen:jml_persen,
            tipe:tipe,
            coin:coin,
            price:price
        });
        const title = key.toUpperCase();
        if(jml_persen > persen_naik && !status_up_down){
            pesan += `\u{1F680} <b>Kemungkinan ${title} Sedang di PUMP</b>\u{1F680}<pre>Harga Terakhir ${price} kenaikan mencapai ${jml_persen} %</pre>\n\n`;
        }else if(jml_persen < persen_turun && !status_up_down){
            pesan += `\u{2757} <b>${title} Masih Downtrend\u{2757}</b> <pre>Harga Terakhir ${price} 24H : ${jml_persen} %</pre>\n\n`;    
        }
    });

    if(pesan != ''){
        bot.sendMessage("@wentesting", pesan, {parse_mode : "HTML"});
    }
    
    status_up_down = true;
    Logfile(obj);
}

RubahNilai = (tipe, values) => {
    if(tipe == 'btc'){
        return parseFloat((values/1e8)).toFixed(8)+ ' BTC';
    }else{
        let rupiah = numeral(values).format('0,0');
        return 'Rp.'+ rupiah;
    }
}

Logfile = (data) => {
    let jsondata = JSON.stringify(data);
    fs.writeFileSync('bitcoin.json', jsondata);
}

BacaHargaTerakhir = () => {
    let rawdata = fs.readFileSync('bitcoin.json'); 
    let harga_terakhir = JSON.parse(rawdata);
    let pesan = '';
    Object.keys(harga_terakhir.harga_terakhir).forEach(function(key){
        let hrg = harga_terakhir.harga_terakhir[key]['price'];
        let persen = harga_terakhir.harga_terakhir[key]['jml_persen'];
        let coin = harga_terakhir.harga_terakhir[key]['key'].toUpperCase();

        pesan += `${coin} = ${hrg} (${persen} %)\n`;
    });

    bot.sendMessage("@wentesting", `<pre>${pesan}</pre>`,{parse_mode : "HTML"});
}

schedule.scheduleJob('*/5 * * * *', function(){
    BacaHargaTerakhir();
});

schedule.scheduleJob('*/3 * * * *', function(){
    status_up_down = false;
});

