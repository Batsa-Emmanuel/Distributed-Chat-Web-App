import asyncio
import json
import websockets # pyright: ignore[reportMissingImports]

TCP_HOST = '127.0.0.1'
TCP_PORT = 9000
WS_HOST = '0.0.0.0'
WS_PORT = 8765


async def bridge(ws, path):
    # For each websocket client, open a TCP connection to the server
    reader, writer = await asyncio.open_connection(TCP_HOST, TCP_PORT)

    async def ws_to_tcp():
        try:
            async for message in ws:
                data = json.loads(message)
                # forward raw JSON to TCP server (append newline)
                writer.write((json.dumps(data) + '\n').encode())
                await writer.drain()
        except websockets.ConnectionClosed:
            pass

    async def tcp_to_ws():
        try:
            while True:
                line = await reader.readline()
                if not line:
                    break
                try:
                    msg = json.loads(line.decode())
                except Exception:
                    continue
                await ws.send(json.dumps(msg))
        except websockets.ConnectionClosed:
            pass

    tasks = [asyncio.create_task(ws_to_tcp()), asyncio.create_task(tcp_to_ws())]
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
    try:
        writer.close()
        await writer.wait_closed()
    except:
        pass


async def main():
    print(f'WebSocket gateway listening on ws://{WS_HOST}:{WS_PORT} -> tcp://{TCP_HOST}:{TCP_PORT}')
    async with websockets.serve(bridge, WS_HOST, WS_PORT):
        await asyncio.Future()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('gateway stopped')
