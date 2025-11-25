import React, { useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import AddPlayerModal from "./AddPlayerModal";
import { Player } from "../../types/player";

interface PlayerRegistrationFormProps {
  onAddPlayer: (player: Omit<Player, "id">) => Promise<void>;
  disabled?: boolean;
}

const PlayerRegistrationForm: React.FC<PlayerRegistrationFormProps> = ({
  onAddPlayer,
  disabled = false,
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleAddPlayer = async (player: { name: string; position: any; skillLevel: any }) => {
    await onAddPlayer(player);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4 flex items-center">
          <UserPlus className="mr-2 text-green-600" size={20} /> Player Registration
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Register new players to add them to the roster. All players are shared across all users.
        </p>
        <button
          onClick={() => setShowModal(true)}
          disabled={disabled}
          className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-700 transition duration-300 shadow-md disabled:bg-gray-400 flex items-center justify-center"
        >
          <Plus className="mr-2" size={18} /> Register New Player
        </button>
      </div>

      {showModal && (
        <AddPlayerModal
          onClose={() => setShowModal(false)}
          onAddPlayer={handleAddPlayer}
        />
      )}
    </>
  );
};

export default PlayerRegistrationForm;

