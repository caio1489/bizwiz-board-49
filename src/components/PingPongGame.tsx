import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface GameState {
  leftPaddleY: number;
  rightPaddleY: number;
  ballX: number;
  ballY: number;
  ballVelocityX: number;
  ballVelocityY: number;
  leftScore: number;
  rightScore: number;
  gameStatus: 'waiting' | 'playing' | 'paused';
}

const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 12;
const BALL_SIZE = 12;
const PADDLE_SPEED = 7;
const BALL_SPEED = 4;

export const PingPongGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();
  const keysRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>({
    leftPaddleY: 250,
    rightPaddleY: 250,
    ballX: 400,
    ballY: 250,
    ballVelocityX: BALL_SPEED,
    ballVelocityY: BALL_SPEED,
    leftScore: 0,
    rightScore: 0,
    gameStatus: 'waiting'
  });

  const resetBall = useCallback(() => {
    return {
      ballX: 400,
      ballY: 250,
      ballVelocityX: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
      ballVelocityY: (Math.random() - 0.5) * BALL_SPEED
    };
  }, []);

  const updateGame = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return;

    setGameState(prevState => {
      let newState = { ...prevState };

      // Paddle movement
      if (keysRef.current.has('w') && newState.leftPaddleY > 0) {
        newState.leftPaddleY -= PADDLE_SPEED;
      }
      if (keysRef.current.has('s') && newState.leftPaddleY < 500 - PADDLE_HEIGHT) {
        newState.leftPaddleY += PADDLE_SPEED;
      }
      if (keysRef.current.has('arrowup') && newState.rightPaddleY > 0) {
        newState.rightPaddleY -= PADDLE_SPEED;
      }
      if (keysRef.current.has('arrowdown') && newState.rightPaddleY < 500 - PADDLE_HEIGHT) {
        newState.rightPaddleY += PADDLE_SPEED;
      }

      // Ball movement
      newState.ballX += newState.ballVelocityX;
      newState.ballY += newState.ballVelocityY;

      // Ball collision with top and bottom walls
      if (newState.ballY <= 0 || newState.ballY >= 500 - BALL_SIZE) {
        newState.ballVelocityY = -newState.ballVelocityY;
      }

      // Ball collision with paddles
      // Left paddle
      if (
        newState.ballX <= PADDLE_WIDTH &&
        newState.ballY >= newState.leftPaddleY &&
        newState.ballY <= newState.leftPaddleY + PADDLE_HEIGHT
      ) {
        newState.ballVelocityX = Math.abs(newState.ballVelocityX);
        const hitPos = (newState.ballY - newState.leftPaddleY) / PADDLE_HEIGHT;
        newState.ballVelocityY = (hitPos - 0.5) * BALL_SPEED * 2;
      }

      // Right paddle
      if (
        newState.ballX >= 800 - PADDLE_WIDTH - BALL_SIZE &&
        newState.ballY >= newState.rightPaddleY &&
        newState.ballY <= newState.rightPaddleY + PADDLE_HEIGHT
      ) {
        newState.ballVelocityX = -Math.abs(newState.ballVelocityX);
        const hitPos = (newState.ballY - newState.rightPaddleY) / PADDLE_HEIGHT;
        newState.ballVelocityY = (hitPos - 0.5) * BALL_SPEED * 2;
      }

      // Scoring
      if (newState.ballX < 0) {
        newState.rightScore++;
        Object.assign(newState, resetBall());
        toast({
          title: "Ponto!",
          description: `Jogador 2 marcou! Placar: ${newState.leftScore} - ${newState.rightScore}`,
        });
      } else if (newState.ballX > 800) {
        newState.leftScore++;
        Object.assign(newState, resetBall());
        toast({
          title: "Ponto!",
          description: `Jogador 1 marcou! Placar: ${newState.leftScore} - ${newState.rightScore}`,
        });
      }

      return newState;
    });
  }, [gameState.gameStatus, resetBall, toast]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'hsl(var(--background))';
    ctx.fillRect(0, 0, 800, 500);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'hsl(var(--primary) / 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 500);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = 'hsl(var(--primary))';
    ctx.fillRect(0, gameState.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillRect(800 - PADDLE_WIDTH, gameState.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillStyle = 'hsl(var(--warning))';
    ctx.fillRect(gameState.ballX, gameState.ballY, BALL_SIZE, BALL_SIZE);

    // Draw scores
    ctx.font = '48px system-ui';
    ctx.fillStyle = 'hsl(var(--foreground) / 0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.leftScore.toString(), 200, 60);
    ctx.fillText(gameState.rightScore.toString(), 600, 60);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      const gameLoop = () => {
        updateGame();
        draw();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
      };
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      draw();
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameStatus, updateGame, draw]);

  const startGame = () => {
    setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
    toast({
      title: "Jogo iniciado!",
      description: "Jogador 1: W/S | Jogador 2: ↑/↓",
    });
  };

  const pauseGame = () => {
    setGameState(prev => ({ 
      ...prev, 
      gameStatus: prev.gameStatus === 'playing' ? 'paused' : 'playing' 
    }));
  };

  const resetGame = () => {
    setGameState({
      leftPaddleY: 250,
      rightPaddleY: 250,
      ...resetBall(),
      leftScore: 0,
      rightScore: 0,
      gameStatus: 'waiting'
    });
    toast({
      title: "Jogo reiniciado!",
      description: "Pronto para uma nova partida!",
    });
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1 className="game-title">Ping Pong</h1>
        <div className="game-score">
          <span className="score-label">Jogador 1</span>
          <span className="score-value">{gameState.leftScore}</span>
          <span className="score-separator">-</span>
          <span className="score-value">{gameState.rightScore}</span>
          <span className="score-label">Jogador 2</span>
        </div>
      </div>

      <div className="game-canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="game-canvas"
        />
        
        {gameState.gameStatus === 'waiting' && (
          <div className="game-overlay">
            <h2 className="overlay-title">Pronto para jogar?</h2>
            <p className="overlay-instructions">
              Jogador 1: Use W/S para mover<br/>
              Jogador 2: Use ↑/↓ para mover
            </p>
          </div>
        )}
        
        {gameState.gameStatus === 'paused' && (
          <div className="game-overlay">
            <h2 className="overlay-title">Jogo Pausado</h2>
          </div>
        )}
      </div>

      <div className="game-controls">
        {gameState.gameStatus === 'waiting' && (
          <Button onClick={startGame} className="game-button game-button-primary">
            Iniciar Jogo
          </Button>
        )}
        
        {gameState.gameStatus !== 'waiting' && (
          <>
            <Button onClick={pauseGame} className="game-button game-button-secondary">
              {gameState.gameStatus === 'playing' ? 'Pausar' : 'Continuar'}
            </Button>
            <Button onClick={resetGame} className="game-button game-button-outline">
              Reiniciar
            </Button>
          </>
        )}
      </div>
    </div>
  );
};