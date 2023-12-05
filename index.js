var express = require('express')
const http = require("http");
const fs = require('fs');
var app = express();
const path = require('path');

//const filePath = './data/info.json';
const folderPath = './car'

const server = http.createServer(app);
const socketIo = require("socket.io")(server, {
  cors: {
      origin: "*",
  }
}); 

// hàm đọc file json
function readJSONFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (err) {
    console.error('Error reading the JSON file:', err.message);
    return null;
  }
}

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    const data = {
        message: 'Hello from server!',
        items: ['Item 1', 'Item 2', 'Item 3'],
    };

    res.render('index', { data });
});

app.get('/datatable', (req, res) => {
  const data = readJSONFile('./data/fakeData.json');
  res.render('datatable', { data });

});

function readInfo(callback) {
  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    if (jsonFiles?.length > 0) {
      const filePath_ = folderPath + '/' + jsonFiles[0]
      console.log("filePath_", filePath_)
      fs.readFile(filePath_, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            callback(err, null);
            return;
        }
        try {
            const jsonData = JSON.parse(data);
            callback(null, jsonData);
            fs.unlink(filePath_, (err) => {
              if (err) {
                console.error('Error deleting file:', err);
                return;
              }
              console.log('File deleted successfully.');
            });
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            callback(parseError, null);
        }
    });
    }
  });

  
}

socketIo.on("connect", (socket) => { 
  console.log("New client connected" + socket.id); 

  // mỏ gửi request
  socket.on("send_request", function(data) {
    console.log(data) 
    // thông báo tới giao diện server
    socketIo.emit('noti_to_server', 'Có yêu cầu đặt xe từ mỏ');
    socketIo.emit("forward_request", { data });
   
  })

  socket.on("accept_request", function(data) { 
    console.log(data) 
    socketIo.emit("confirm_request", { data });
  })
  // đọc file và thông báo

  socket.on("disconnect", () => {
    console.log("Client disconnected"); 
  });
});

function alertTruck () {
  readInfo((error, jsonData) => {
    if (error) {
        console.error(error);
    } else {
        const message = `Xe có biển số ${jsonData?.CarPlate} đang đi lệch so với đích 10km`
        socketIo.emit('warn_to_server', message);
        socketIo.emit('warn_to_client_truck', message);
    }
});
}
const setId = setInterval(alertTruck, 20000);
socketIo.on("cancel", function(data) {
    console.log("đây")
    clearInterval(setId)
  })
server.listen(3000, () => {
    console.log('Server đang chay tren cong 3000');
});
