import Express from "express";
import { Server } from "socket.io";

const app = Express();

const server = app.listen(5000);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`Socket ${socket.id} Connected`);

  socket.emit("me", socket.id);

  socket.on("disconnect", () => {
    console.log("disconnect");
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", (data) => {
    io.to(data.userToCall).emit("callUser", {
      signal: data.signal,
      from: data.from,
      name: data.name,
    });
  });

  socket.on("answerCall", (data) => {
    console.log("answerCall");
    io.to(data.to).emit("callAccepted", data.signal);
  });
});
