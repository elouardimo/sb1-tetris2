import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

// Tetromino shapes
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]]
];

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

const createEmptyBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

function App() {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState({ shape: [[]], color: '', x: 0, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const gameLoopRef = useRef<number | null>(null);

  const spawnNewPiece = useCallback(() => {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    const newPiece = {
      shape: SHAPES[shapeIndex],
      color: COLORS[shapeIndex],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(SHAPES[shapeIndex][0].length / 2),
      y: 0
    };
    setCurrentPiece(newPiece);
    return newPiece;
  }, []);

  const isValidMove = useCallback((shape: number[][], x: number, y: number, currentBoard: string[][]) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT || (newY >= 0 && currentBoard[newY][newX])) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const mergePieceToBoard = useCallback((piece: typeof currentPiece, currentBoard: string[][]) => {
    const newBoard = currentBoard.map(row => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          newBoard[y + piece.y][x + piece.x] = piece.color;
        }
      });
    });
    return newBoard;
  }, []);

  const checkLines = useCallback((currentBoard: string[][]) => {
    let linesCleared = 0;
    const newBoard = currentBoard.filter(row => {
      if (row.every(cell => cell !== 0)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0));
    }
    
    setBoard(newBoard);
    setScore(prevScore => prevScore + linesCleared * 100);
  }, []);

  const movePiece = useCallback((dx: number, dy: number) => {
    if (isPaused) return;
    setCurrentPiece(prev => {
      if (isValidMove(prev.shape, prev.x + dx, prev.y + dy, board)) {
        return { ...prev, x: prev.x + dx, y: prev.y + dy };
      } else if (dy > 0) {
        const newBoard = mergePieceToBoard(prev, board);
        setBoard(newBoard);
        checkLines(newBoard);
        const newPiece = spawnNewPiece();
        if (!isValidMove(newPiece.shape, newPiece.x, newPiece.y, newBoard)) {
          setGameOver(true);
        }
        return newPiece;
      }
      return prev;
    });
  }, [board, isPaused, isValidMove, mergePieceToBoard, checkLines, spawnNewPiece]);

  const rotatePiece = useCallback(() => {
    if (isPaused) return;
    setCurrentPiece(prev => {
      const rotated = prev.shape[0].map((_, index) =>
        prev.shape.map(row => row[index]).reverse()
      );
      if (isValidMove(rotated, prev.x, prev.y, board)) {
        return { ...prev, shape: rotated };
      }
      return prev;
    });
  }, [isPaused, isValidMove, board]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameOver || isPaused) return;
    switch (event.key) {
      case 'ArrowLeft':
        movePiece(-1, 0);
        break;
      case 'ArrowRight':
        movePiece(1, 0);
        break;
      case 'ArrowDown':
        movePiece(0, 1);
        break;
      case 'ArrowUp':
        rotatePiece();
        break;
    }
  }, [gameOver, isPaused, movePiece, rotatePiece]);

  useEffect(() => {
    const newPiece = spawnNewPiece();
    if (!isValidMove(newPiece.shape, newPiece.x, newPiece.y, board)) {
      setGameOver(true);
    }
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [spawnNewPiece, isValidMove, board, handleKeyPress]);

  useEffect(() => {
    if (gameOver || isPaused) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    } else {
      gameLoopRef.current = setInterval(() => {
        movePiece(0, 1);
      }, 1000);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameOver, isPaused, movePiece]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    const newPiece = spawnNewPiece();
    setCurrentPiece(newPiece);
  }, [spawnNewPiece]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const renderBoard = useCallback(() => {
    const boardWithPiece = board.map(row => [...row]);
    if (!gameOver) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value && currentPiece.y + y >= 0) {
            boardWithPiece[currentPiece.y + y][currentPiece.x + x] = currentPiece.color;
          }
        });
      });
    }

    return boardWithPiece.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={x}
            className="w-6 h-6 border border-gray-300"
            style={{ backgroundColor: cell || 'transparent' }}
          />
        ))}
      </div>
    ));
  }, [board, currentPiece, gameOver]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-4 text-center">Tetris</h1>
        <div className="flex justify-between mb-4">
          <div className="text-xl font-semibold">Score: {score}</div>
          <div className="flex space-x-2">
            <button
              onClick={togglePause}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              {isPaused ? <Play size={24} /> : <Pause size={24} />}
            </button>
            <button
              onClick={resetGame}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              <RotateCcw size={24} />
            </button>
          </div>
        </div>
        <div className="border-4 border-gray-800 p-1">
          {renderBoard()}
        </div>
        {gameOver && (
          <div className="mt-4 text-center">
            <p className="text-xl font-bold text-red-600">Game Over!</p>
            <button
              onClick={resetGame}
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;