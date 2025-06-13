// client/src/components/CardDisplay.jsx
import React from 'react';
import Card from 'react-bootstrap/Card'; // Don't forget this import

function CardDisplay({ card, showIndex = false }) {
  return (
    <Card style={{ width: '12rem', margin: '0.5rem' }}>
      <Card.Img variant="top" src={card.image} alt={card.name} />
      <Card.Body>
        <Card.Title style={{ fontSize: '1rem' }}>{card.name}</Card.Title>
        {showIndex && <Card.Text>Bad Luck Index: {card.bad_luck_index}</Card.Text>}
      </Card.Body>
    </Card>
  );
}
export default CardDisplay;